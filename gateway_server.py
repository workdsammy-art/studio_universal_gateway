import copy
import time
import uuid
from pathlib import Path

import execution
from aiohttp import web
from server import PromptServer

DATA: dict = {}

routes = web.RouteTableDef()


@routes.post("/gateway/data")
async def post_data(request):
    global DATA
    body = await request.json()
    DATA = body
    DATA["last_updated"] = time.time()
    return web.json_response({"ok": True})


@routes.get("/gateway/data")
async def get_data(request):
    return web.json_response(DATA)


@routes.post("/gateway/run")
async def post_run(request):
    body = await request.json()
    output = body.get("output", {})
    workflow = body.get("workflow", {})
    values = body.get("values", {})
    client_id = body.get("client_id")

    enriched = copy.deepcopy(output)

    input_nodes = {}
    output_nodes = {}
    for node in workflow.get("nodes", []):
        nid = str(node.get("id"))
        wv = node.get("properties", {}).get("gateway", {})
        if node.get("type") == "Studio_Universal_Gateway":
            input_nodes[nid] = wv
        elif node.get("type") == "Studio_Output_Gateway":
            output_nodes[nid] = wv

    input_ids = set(input_nodes.keys())
    for node_id, node_data in enriched.items():
        inputs = node_data.get("inputs")
        if not isinstance(inputs, dict):
            continue
        new_inputs = {}
        for name, val in inputs.items():
            if isinstance(val, list) and len(val) >= 2 and str(val[0]) in input_ids:
                src_id = str(val[0])
                src_idx = val[1]
                wv = input_nodes[src_id]
                var_name = wv.get(f"name_{src_idx}")
                if var_name and var_name in values:
                    new_inputs[name] = values[var_name]
                else:
                    new_inputs[name] = val
            else:
                new_inputs[name] = val
        node_data["inputs"] = new_inputs

    for nid in input_ids:
        enriched.pop(nid, None)

    for nid, wv in output_nodes.items():
        if nid not in enriched:
            continue
        inputs = enriched[nid].get("inputs", {})
        for key, val in wv.items():
            if key.startswith(("name_", "widget_type_", "position_", "min_", "max_", "step_", "control_", "options_")):
                inputs[key] = val
        enriched[nid]["inputs"] = inputs

    prompt_id = str(uuid.uuid4())
    valid = await execution.validate_prompt(prompt_id, enriched, None)
    if not valid[0]:
        return web.json_response({"error": valid[1]}, status=400)

    outputs_to_execute = valid[2]
    server = PromptServer.instance
    server.number += 1
    extra_data = {}
    if client_id:
        extra_data["client_id"] = client_id
    extra_data["create_time"] = int(time.time() * 1000)

    server.prompt_queue.put((
        float(server.number),
        prompt_id,
        enriched,
        extra_data,
        outputs_to_execute,
        {},
    ))

    return web.json_response({"prompt_id": prompt_id})


@routes.post("/gateway/interrupt")
async def post_interrupt(request):
    server = PromptServer.instance
    server.interrupt()
    return web.json_response({"status": "interrupted"})


@routes.patch("/gateway/settings")
async def patch_settings(request):
    body = await request.json()
    name = body.get("name")
    control = body.get("control")
    if not name or not control:
        return web.json_response({"error": "missing name or control"}, status=400)
    if "input_widgets" in DATA:
        for w in DATA["input_widgets"]:
            if w.get("name") == name:
                w["dashboard_control"] = control
                break
    DATA["last_updated"] = time.time()
    return web.json_response({"ok": True})


def register_routes():
    built = Path(__file__).parent.absolute() / "dashboard" / "dist"
    index_html = built / "index.html"
    if built.is_dir() and index_html.exists():
        routes.static("/gateway/assets", str(built / "assets"))
        async def serve_index(_request):
            return web.FileResponse(index_html)
        routes.get("/gateway")(serve_index)
        routes.get("/gateway/")(serve_index)
    app = PromptServer.instance.app
    try:
        app.add_routes(routes)
    except RuntimeError:
        app.router.add_routes(routes)

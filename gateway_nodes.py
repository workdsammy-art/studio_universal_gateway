import logging

from comfy_api.latest import io

logger = logging.getLogger("studio_gateway")


class StudioInputGateway(io.ComfyNode):
    """Studio Input Gateway - Defines input variables for a studio dashboard.

    Each row configures a variable's widget type, layout position, and key name.
    Outputs a list of all defined variable key names.
    Dynamic link_N slots are created by JS.
    """

    @classmethod
    def define_schema(cls) -> io.Schema:
        return io.Schema(
            node_id="Studio_Universal_Gateway",
            display_name="Studio Input Gateway",
            category="Studio",
            description="Defines input variables for a studio dashboard",
            inputs=[],
            outputs=[],
            is_output_node=False,
            hidden=[io.Hidden.unique_id],
            accept_all_inputs=True,
        )

    @classmethod
    def execute(cls, **kwargs):
        if not getattr(cls, "_warned_dashboard", False):
            cls._warned_dashboard = True
            logger.warning(
                "Studio Input Gateway executed directly (e.g. Queue Prompt). "
                "Run from the Studio Gateway dashboard for proper input/output mapping."
            )
        return io.NodeOutput()


class StudioOutputGateway(io.ComfyNode):
    """Studio Output Gateway - Collects data from connected upstream nodes.

    Maps data to named dashboard outputs with widget type and position metadata.
    Emits a studio_assets UI payload.
    Dynamic link_N slots are created by JS.
    """

    @classmethod
    def define_schema(cls) -> io.Schema:
        return io.Schema(
            node_id="Studio_Output_Gateway",
            display_name="Studio Output Gateway",
            category="Studio",
            description="Collects data from upstream nodes for studio dashboard",
            inputs=[],
            outputs=[],
            is_output_node=True,
            hidden=[io.Hidden.unique_id],
            accept_all_inputs=True,
        )

    @classmethod
    def execute(cls, **kwargs) -> io.NodeOutput:
        studio_assets_list = []
        link_states = {}

        def _unwrap(v):
            if isinstance(v, list) and len(v) == 1:
                return v[0]
            return v

        i = 0
        while True:
            name_key = f"name_{i}"
            link_key = f"link_{i}"
            if name_key not in kwargs and link_key not in kwargs:
                break

            var_name = _unwrap(kwargs[name_key]) if name_key in kwargs else f"output_{i}"
            if not var_name:
                var_name = f"output_{i}"

            # A slot is connected if its value arrives under `link_i` (intended
            # design) OR under the variable name itself (current canvas behavior).
            # Image links often resolve to None (the filename lives in the
            # `executed` message), so connection is key presence, not value.
            raw = None
            connected = False
            if link_key in kwargs:
                raw = kwargs[link_key]
                connected = True
            elif var_name in kwargs:
                raw = kwargs[var_name]
                connected = True
            link_states[link_key] = connected

            if connected:
                data = raw
                # get_input_data wraps cache misses in (None,) tuples
                if isinstance(data, tuple) and len(data) == 1:
                    data = data[0]
                widget_type = _unwrap(kwargs.get(f"widget_type_{i}", "text"))
                position = _unwrap(kwargs.get(f"position_{i}", "middle"))

                entry = {"name": var_name, "ui_type": widget_type, "position": position}

                if isinstance(data, dict) and "filename" in data:
                    entry["data"] = data["filename"]
                    entry["subfolder"] = data.get("subfolder", "")
                    entry["type"] = data.get("type", "output")
                elif isinstance(data, (str, int, float, bool, type(None))):
                    entry["data"] = data
                elif isinstance(data, (list, dict)):
                    import json
                    try:
                        json.dumps(data)
                        entry["data"] = data
                    except TypeError:
                        entry["data"] = None
                else:
                    entry["data"] = None

                studio_assets_list.append(entry)

            i += 1

        return io.NodeOutput(
            ui={"studio_assets": studio_assets_list, "link_states": link_states}
        )

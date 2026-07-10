from comfy_api.latest import ComfyExtension

from .gateway_nodes import StudioInputGateway, StudioOutputGateway

WEB_DIRECTORY = "./web/js"


class StudioGatewayExtension(ComfyExtension):
    async def get_node_list(self):
        return [StudioInputGateway, StudioOutputGateway]


async def comfy_entrypoint():
    from .gateway_server import register_routes

    register_routes()
    return StudioGatewayExtension()

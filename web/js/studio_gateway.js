import { app } from "/scripts/app.js";
import { api } from "/scripts/api.js";

const WIDGET_TYPES = [
    "text", "text(line)", "text(multiline)", "slider", "toggle", "color", "number(int)", "number(float)", "select", "image", "metrics"
];

const POSITIONS = ["left", "middle", "right"];
function getControlModes(widgetType) {
    if (["slider", "number(int)", "number(float)"].includes(widgetType)) {
        return ["fixed", "randomize", "increment", "decrement"];
    }
    return ["fixed"];
}

const NODE_ID_INPUT = "Studio_Universal_Gateway";
const NODE_ID_OUTPUT = "Studio_Output_Gateway";
const ROW_HEIGHT = 20;
const OPT_START_Y = 18;


function getStore(node) {
    if (!node.properties) node.properties = {};
    if (!node.properties.gateway) node.properties.gateway = {};
    return node.properties.gateway;
}

function isInputGateway(node) {
    return node.comfyClass === NODE_ID_INPUT;
}

function getAllSlots(node) {
    return isInputGateway(node) ? node.outputs : node.inputs;
}

function defaultName(node, index) {
    return isInputGateway(node) ? `input_${index}` : `output_${index}`;
}

function addSlot(node, name) {
    if (isInputGateway(node)) {
        node.addOutput(name, "*");
    } else {
        node.addInput(name, "*");
    }
}

function ensureSlotOptions(node, index) {
    const store = getStore(node);
    if (!store[`name_${index}`]) {
        store[`name_${index}`] = defaultName(node, index);
    }
    if (!store[`widget_type_${index}`]) {
        store[`widget_type_${index}`] = "text";
    }
    if (!store[`position_${index}`]) {
        store[`position_${index}`] = "middle";
    }
    if (!(`active_${index}` in store)) {
        store[`active_${index}`] = false;
    }
    if (!(`min_${index}` in store)) {
        store[`min_${index}`] = 0;
    }
    if (!(`max_${index}` in store)) {
        store[`max_${index}`] = 100;
    }
    if (!(`step_${index}` in store)) {
        store[`step_${index}`] = 1;
    }
    if (!(`default_${index}` in store)) {
        store[`default_${index}`] = null;
    }
    if (!(`control_${index}` in store)) {
        store[`control_${index}`] = "fixed";
    }
    const modes = getControlModes(store[`widget_type_${index}`]);
    if (!modes.includes(store[`control_${index}`])) {
        store[`control_${index}`] = "fixed";
    }
}

function syncSlotNames(node) {
    const slots = getAllSlots(node);
    const store = getStore(node);
    for (let i = 0; i < slots.length; i++) {
        let stored = store[`name_${i}`];
        if (!stored) {
            stored = defaultName(node, i);
            store[`name_${i}`] = stored;
        }
    }
}

function updateInputs(node) {
    const slots = getAllSlots(node);
    if (slots.length === 0) return;

    const store = getStore(node);
    const lastIdx = slots.length - 1;

    if (store[`active_${lastIdx}`]) {
        const nextIndex = slots.length;
        addSlot(node, `link_${nextIndex}`);
        ensureSlotOptions(node, nextIndex);
    }

    const newHeight = OPT_START_Y + slots.length * ROW_HEIGHT + 16;
    if (node.size[1] < newHeight) {
        node.size[1] = newHeight;
    }

    node.setDirtyCanvas(true, true);
}

function syncInitialSlots(node) {
    const slots = getAllSlots(node);
    if (slots.length === 0) {
        addSlot(node, "link_0");
        ensureSlotOptions(node, 0);
        syncSlotNames(node);
    }
    node.setDirtyCanvas(true, true);
}

// --- Auto-detect widget type from connected node ---

async function detectDownstreamSpec(node, outputIndex) {
    const slot = node.outputs[outputIndex];
    if (!slot || !slot.links || slot.links.length === 0) return null;

    const link = app.graph.links[slot.links[0]];
    if (!link) return null;

    const targetNode = app.graph.getNodeById(link.target_id);
    if (!targetNode) return null;

    const targetSlot = targetNode.inputs[link.target_slot];
    if (!targetSlot) return null;

    const inputName = targetSlot.name;

    const defs = await api.getNodeDefs();
    const nodeDef = defs[targetNode.comfyClass];
    if (!nodeDef) return null;

    const rawSpec = nodeDef.input?.required?.[inputName] ?? nodeDef.input?.optional?.[inputName];
    if (!rawSpec) return null;

    const specType = Array.isArray(rawSpec[0]) ? "COMBO" : rawSpec[0];
    const config = rawSpec[1] ?? {};

    return {
        type: specType,
        options: specType === "COMBO" ? rawSpec[0] : null,
        min: config.min,
        max: config.max,
        step: config.step,
        default: config.default,
        display: config.display,
        forceInput: config.forceInput,
        control_after_generate: config.control_after_generate,
    };
}

function specTypeToUI(spec) {
    if (!spec) return "text";
    switch (spec.type) {
        case "INT":
            if (spec.display === "slider") return "slider";
            if (spec.min !== undefined && spec.max !== undefined && (spec.max - spec.min) <= 1000) return "slider";
            return "number(int)";
        case "FLOAT":
            if (spec.display === "slider") return "slider";
            if (spec.min !== undefined && spec.max !== undefined && (spec.max - spec.min) <= 10) return "slider";
            return "number(float)";
        case "BOOLEAN":
            return "toggle";
        case "STRING":
            if (spec.display === "multiline") return "text(multiline)";
            return "text(line)";
        case "COMBO":
            return "select";
        case "COLOR":
            return "color";
        default:
            return "text";
    }
}

function detectControlDefault(spec) {
    if (!spec || !spec.control_after_generate) return "fixed";
    if (spec.control_after_generate === true) return "randomize";
    if (typeof spec.control_after_generate === "string") return spec.control_after_generate;
    return "fixed";
}

async function ensureSlotDetected(node, index) {
    const store = getStore(node);
    if (!isInputGateway(node)) return;

    const spec = await detectDownstreamSpec(node, index);
    if (spec) {
        const prevDetected = store[`detected_type_${index}`];
        store[`detected_type_${index}`] = spec.type;
        store[`min_${index}`] = spec.min ?? 0;
        store[`max_${index}`] = spec.max ?? 100;
        store[`step_${index}`] = spec.step ?? 1;
        store[`default_${index}`] = spec.default;

        const suggestedType = specTypeToUI(spec);
        if (!store[`widget_type_${index}`] || store[`widget_type_${index}`] === "text" || (prevDetected && prevDetected !== spec.type)) {
            store[`widget_type_${index}`] = suggestedType;
        }
        if (!store[`control_${index}`] || store[`control_${index}`] === "fixed" || (prevDetected && prevDetected !== spec.type)) {
            store[`control_${index}`] = detectControlDefault(spec);
        }

        if (spec.type === "COMBO" && Array.isArray(spec.options)) {
            store[`options_${index}`] = spec.options;
        } else {
            delete store[`options_${index}`];
        }
    }
}

function detectExistingConnections(node) {
    if (!isInputGateway(node)) return;
    const slots = node.outputs;
    const promises = [];
    for (let i = 0; i < slots.length; i++) {
        if (slots[i].links && slots[i].links.length > 0) {
            promises.push(ensureSlotDetected(node, i));
        }
    }
    return promises;
}

// ---

function getOptionPositions(node, slotIdx) {
    const isInput = isInputGateway(node);
    const nodeWidth = node.size[0];
    const y = OPT_START_Y + slotIdx * ROW_HEIGHT;
    const gap = 4;
    const nameW = 78;
    const typeW = 46;
    const posW = 46;
    const ctrlW = 36;

    if (isInput) {
        const nameX = 24;
        const typeX = nameX + nameW + gap;
        const posX = typeX + typeW + gap;
        const ctrlX = posX + posW + gap;
        return {
            y, rowY: y - ROW_HEIGHT / 2, rowH: ROW_HEIGHT,
            nameX, nameW, typeX, typeW, posX, posW, ctrlX, ctrlW,
        };
    } else {
        const ctrlX = nodeWidth - 24 - ctrlW;
        const posX = ctrlX - gap - posW;
        const typeX = posX - gap - typeW;
        const nameX = typeX - gap - nameW;
        return {
            y, rowY: y - ROW_HEIGHT / 2, rowH: ROW_HEIGHT,
            nameX, nameW, typeX, typeW, posX, posW, ctrlX, ctrlW,
        };
    }
}

function isNameTaken(name, excludeNode, excludeIndex) {
    for (const n of app.graph.nodes) {
        if (![NODE_ID_INPUT, NODE_ID_OUTPUT].includes(n.comfyClass)) continue;
        const store = n.properties?.gateway || {};
        for (const key of Object.keys(store)) {
            const m = key.match(/^name_(\d+)$/);
            if (m && store[key] === name && !(n === excludeNode && m[1] === String(excludeIndex))) {
                return true;
            }
        }
    }
    return false;
}

async function handleNameClick(node, index, current) {
    const name = await app.extensionManager.dialog.prompt({
        title: "Variable Name",
        message: "Enter a unique variable name:",
        defaultValue: current,
    });
    if (name === null || name === undefined) return;
    const trimmed = name.trim();
    if (!trimmed || trimmed === current) return;
    if (isNameTaken(trimmed, node, index)) {
        app.extensionManager.toast.add({
            severity: "error",
            summary: "Duplicate name",
            detail: `"${trimmed}" is already used in another gateway node`,
        });
        return;
    }
    getStore(node)[`name_${index}`] = trimmed;
    if (isInputGateway(node)) {
        const slots = getAllSlots(node);
        if (slots[index]) slots[index].name = trimmed;
    }
    syncSlotNames(node);
    node.setDirtyCanvas(true, true);
}

function handleSlotClick(event, node, index, clickX) {
    const pos = getOptionPositions(node, index);
    const store = getStore(node);

    if (clickX >= pos.nameX && clickX < pos.nameX + pos.nameW) {
        const current = store[`name_${index}`] || defaultName(node, index);
        handleNameClick(node, index, current);
        return true;
    } else if (clickX >= pos.typeX && clickX < pos.typeX + pos.typeW) {
        const current = store[`widget_type_${index}`] || "text";
        showContextMenu(event, node, current, WIDGET_TYPES, (selected) => {
            store[`widget_type_${index}`] = selected;
            if (!getControlModes(selected).includes(store[`control_${index}`])) {
                store[`control_${index}`] = "fixed";
            }
            node.setDirtyCanvas(true, true);
        });
        return true;
    } else if (clickX >= pos.posX && clickX < pos.posX + pos.posW) {
        const current = store[`position_${index}`] || "middle";
        showContextMenu(event, node, current, POSITIONS, (selected) => {
            store[`position_${index}`] = selected;
            node.setDirtyCanvas(true, true);
        });
        return true;
    } else if (clickX >= pos.ctrlX && clickX < pos.ctrlX + pos.ctrlW) {
        const widgetType = store[`widget_type_${index}`] || "text";
        const current = store[`control_${index}`] || "fixed";
        showContextMenu(event, node, current, getControlModes(widgetType), (selected) => {
            store[`control_${index}`] = selected;
            node.setDirtyCanvas(true, true);
        });
        return true;
    }
    return false;
}

function showContextMenu(event, node, currentValue, options, onSelect) {
    new LiteGraph.ContextMenu(
        options.map(opt => ({
            content: opt + (opt === currentValue ? " (current)" : ""),
            value: opt,
        })),
        {
            event: event,
            callback: (value) => {
                onSelect(value.value || value);
                node.setDirtyCanvas(true, true);
            },
            title: "Select",
        }
    );
}

function isDarkCanvas() {
    if (document.body.classList.contains('theme-dark')) return true;
    if (document.body.classList.contains('theme-light')) return false;
    return true;
}

function drawSlotOptions(node, ctx) {
    const slots = getAllSlots(node);
    const nodeHeight = node.size[1];
    const store = getStore(node);
    const dark = isDarkCanvas();

    syncSlotNames(node);

    ctx.save();
    ctx.font = "11px monospace";

    slots.forEach((slot, idx) => {
        const pos = getOptionPositions(node, idx);
        if (pos.y > nodeHeight - 10) return;

        const name = store[`name_${idx}`] || defaultName(node, idx);
        const widgetType = store[`widget_type_${idx}`] || "text";
        const detectedType = store[`detected_type_${idx}`];
        const position = store[`position_${idx}`] || "middle";

        ctx.fillStyle = idx % 2 === 0
            ? (dark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.03)")
            : (dark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.05)");
        ctx.fillRect(0, pos.rowY, node.size[0], pos.rowH);

        ctx.fillStyle = dark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)";
        ctx.fillRect(0, pos.rowY + pos.rowH, node.size[0], 1);

        ctx.fillStyle = dark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)";
        ctx.fillRect(pos.nameX - 2, pos.y - 8, pos.nameW + 4, 16);

        ctx.font = "bold 11px monospace";
        ctx.fillStyle = dark ? "#e8e8e8" : "#1c1b1b";
        ctx.fillText(name, pos.nameX, pos.y);

        let typeLabel = widgetType === "number(int)" ? "int"
            : widgetType === "number(float)" ? "float"
            : widgetType === "text(line)" ? "ln"
            : widgetType === "text(multiline)" ? "ml"
            : widgetType;
        if (detectedType && detectedType !== widgetType) {
            typeLabel += "·";
        }
        ctx.font = "10px monospace";
        ctx.fillStyle = dark ? "#7ab8e0" : "#2a6e9e";
        ctx.fillText(typeLabel, pos.typeX, pos.y);

        ctx.fillStyle = dark ? "#9a9a9a" : "#666666";
        ctx.fillText(position, pos.posX, pos.y);

        const ctrl = store[`control_${idx}`] || "fixed";
        const ctrlLabels = { "fixed": "fx", "randomize": "rnd", "increment": "inc", "decrement": "dec" };
        ctx.fillStyle = dark ? "#c8a070" : "#8a6040";
        ctx.fillText(ctrlLabels[ctrl] || "fx", pos.ctrlX, pos.y);
    });

    ctx.restore();
}

function setupNodeInstance(node) {
    node.graph?.markDirty();
    if (node._gatewayInit !== false) {
        node._gatewayInit = true;
    }

    // Force slot names to link_N for correct graphToPrompt serialization
    // Serialized workflows may have user-facing names in slot.name, which
    // would cause graphToPrompt to emit "Output Image" instead of "link_0".
    const allSlots = getAllSlots(node);
    for (let i = 0; i < allSlots.length; i++) {
        allSlots[i].name = "link_" + i;
    }

    const origOnConnectionsChange = node.onConnectionsChange;
    node.onConnectionsChange = function (type, index, connected, link_info) {
        origOnConnectionsChange?.apply(this, arguments);

        const expectedType = isInputGateway(this) ? 2 : 1;
        if (type !== expectedType) return;

        const store = getStore(this);
        store[`active_${index}`] = !!connected;

        if (connected && link_info) {
            updateInputs(this);
            if (isInputGateway(this)) {
                ensureSlotDetected(this, index).catch(() => {});
            }
        }
    };
}

function isSlotConnected(node, index) {
    const slots = getAllSlots(node);
    const slot = slots[index];
    if (!slot) return false;
    if (isInputGateway(node)) {
        return slot.links && slot.links.length > 0;
    } else {
        return slot.link !== null && slot.link !== undefined;
    }
}

function collectWidgets(node) {
    const store = getStore(node);
    const result = [];
    for (const key of Object.keys(store)) {
        const m = key.match(/^name_(\d+)$/);
        if (m) {
            const i = parseInt(m[1]);
            if (!store[`active_${i}`] && !isSlotConnected(node, i)) continue;
            result.push({
                name: store[`name_${i}`],
                ui_type: store[`widget_type_${i}`] || "text",
                position: store[`position_${i}`] || "middle",
                isInput: isInputGateway(node),
                min: store[`min_${i}`],
                max: store[`max_${i}`],
                step: store[`step_${i}`],
                default: store[`default_${i}`] ?? null,
                control: store[`control_${i}`] || "fixed",
                options: store[`options_${i}`] || null,
            });
        }
    }
    return result;
}

// --- Gateway tab communication ---

const bc = new BroadcastChannel("studio-gateway");

async function syncGatewayData() {
    const prompt = await app.graphToPrompt();
    const inputs = [];
    const outputs = [];
    for (const node of app.graph.nodes) {
        if (node.comfyClass === NODE_ID_INPUT) inputs.push(...collectWidgets(node));
        if (node.comfyClass === NODE_ID_OUTPUT) outputs.push(...collectWidgets(node));
    }
    const payload = {
        output: prompt.output,
        workflow: prompt.workflow,
        input_widgets: inputs,
        output_widgets: outputs,
    };
    await fetch("/gateway/data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
    });
    bc.postMessage({ type: "workflow-saved" });
}

function setupSaveHook() {
    const orig = app.saveWorkflow;
    app.saveWorkflow = async function saveHook(...args) {
        const result = await orig.apply(this, args);
        try {
            await syncGatewayData();
        } catch (e) {
            console.warn("gateway sync failed:", e);
        }
        return result;
    };
}

async function openGateway() {
    await syncGatewayData();
    const gw = window.open("/gateway", "studio-gateway");
    if (gw) {
        gw.focus();
    }
}

window.addEventListener("message", async (event) => {
    if (event.source === window) return;
    if (event.origin !== location.origin) return;
    const data = event.data;
    if (!data || !data.type) return;

    if (data.type === "run") {
        try {
            const prompt = await app.graphToPrompt();
            const resp = await fetch("/gateway/run", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    output: prompt.output,
                    workflow: prompt.workflow,
                    values: data.values || {},
                    client_id: data.client_id,
                }),
            });
            const result = await resp.json();
            event.source.postMessage({ type: "run_ack", prompt_id: result.prompt_id }, event.origin);
        } catch (e) {
            event.source.postMessage({ type: "run_error", message: e.message }, event.origin);
        }
    } else if (data.type === "resync") {
        try {
            await syncGatewayData();
            event.source.postMessage({ type: "resynced" }, event.origin);
        } catch (e) {
            console.warn("resync failed:", e);
        }
    }
});

// --- Extension registration ---

let saveHookSetup = false;

const extension = {
    name: "studio_universal_gateway.gateway",

    async setup() {
        const btn = document.createElement("button");
        btn.className = "comfyui-button comfyui-menu-mobile-collapse";
        btn.textContent = "Gateway";
        btn.style.backgroundColor = "#FF3F00";
        btn.style.borderColor = "#FF3F00";
        btn.addEventListener("click", openGateway);
        app.menu.settingsGroup.element.before(btn);
    },

    async beforeRegisterNodeDef(nodeType, nodeData, app) {
        if (![NODE_ID_INPUT, NODE_ID_OUTPUT].includes(nodeType.comfyClass)) return;

        if (!saveHookSetup) {
            saveHookSetup = true;
            setupSaveHook();
        }

        const onConfigure = nodeType.prototype.onConfigure;
        nodeType.prototype.onConfigure = function (o) {
            if (onConfigure) onConfigure.apply(this, arguments);
            this._gatewayInit = false;
            const slots = getAllSlots(this);
            const store = getStore(this);
            for (let i = 0; i < slots.length; i++) {
                store[`active_${i}`] = isSlotConnected(this, i);
                ensureSlotOptions(this, i);
            }
            updateInputs(this);
            if (isInputGateway(this)) {
                const promises = detectExistingConnections(this);
                if (promises.length > 0) {
                    Promise.all(promises).then(() => this.setDirtyCanvas(true, true)).catch(() => {});
                }
            }
        };
    },

    async nodeCreated(node) {
        if (![NODE_ID_INPUT, NODE_ID_OUTPUT].includes(node.comfyClass)) return;

        const origOnDrawForeground = node.onDrawForeground;
        node.onDrawForeground = function (ctx) {
            if (this._gatewayInit) {
                this._gatewayInit = false;
                const slots = getAllSlots(this);
                if (slots.length === 0) {
                    addSlot(this, "link_0");
                    ensureSlotOptions(this, 0);
                }
                for (let i = 0; i < slots.length; i++) {
                    ensureSlotOptions(this, i);
                }
            }
            origOnDrawForeground?.apply(this, arguments);
            drawSlotOptions(this, ctx);
        };

        const origOnMouseDown = node.onMouseDown;
        node.onMouseDown = function (event, pos) {
            const result = origOnMouseDown?.apply(this, arguments);
            if (result) return result;

            const slots = getAllSlots(this);

            for (let idx = 0; idx < slots.length; idx++) {
                const optPos = getOptionPositions(this, idx);
                if (Math.abs(pos[1] - optPos.y) > 10) continue;

                if (pos[0] >= optPos.nameX && pos[0] < optPos.nameX + optPos.nameW ||
                    pos[0] >= optPos.typeX && pos[0] < optPos.typeX + optPos.typeW ||
                    pos[0] >= optPos.posX && pos[0] < optPos.posX + optPos.posW ||
                    pos[0] >= optPos.ctrlX && pos[0] < optPos.ctrlX + optPos.ctrlW) {
                    return handleSlotClick(event, this, idx, pos[0]);
                }
            }

            return false;
        };

        setupNodeInstance(node);
    },
};

app.registerExtension(extension);

figma.showUI(__html__);

interface FMessage {
  type: Messages;
  frameName: string;
}

enum Messages {
  Import = "import",
  Cancel = "cancel",
}

type Shape = "T" | "S";
type BlockType = "Res" | "Com" | "Ind" | "Nat" | "Wat";
type Density = "Rural" | "Suburban" | "Urban" | "UrbanCenter" | "UrbanCore";
type BuildingSize = "1x1" | "1x2" | "2x2" | "2x3" | "3x3" | "2x4" | "3x4" | "4x4" | "4x5" | "5x5" | "5x6" | "6x6" | "6x7" | "7x7" | "7x8" | "8x8";


interface Block {
  shape: Shape;
  type: BlockType;
  density: Density;
  postfix: number;
}

interface Point {
  x: number;
  y: number;
}

interface BuildingSlot {
  position: Point;
  rotation: number;
  size: BuildingSize;
}

interface BlockImport {
  block: Block;
  slots: BuildingSlot[];
}

const OFFSET = 50;
const SIZE = 400;

//<Shape>:<BlockType>_<Density>_NNN
function parseName(name: string): Block {
  const results = name.match(/([TS]):([a-z]+)_([a-z]+)_(\d+)/i);

  return {
    shape: results[1] as Shape,
    type: results[2] as BlockType,
    density: results[3] as Density,
    postfix: parseInt(results[4], 10),
  };
}

function detectSlots(block: Block, node: InstanceNode): BuildingSlot[] {
  const offset = OFFSET + ((OFFSET + SIZE) * block.postfix);
  return node.children.filter(c => c.name.indexOf("Slot ") === 0).map((child: InstanceNode) => {
    return {
      position: {x: Math.round(child.x - offset), y: Math.round(child.y - offset)},
      rotation: Math.round(child.rotation),
      size: child.name.match(/Slot (\w+)/)[1] as BuildingSize,
    };
  });
}

function registerBlock(node: InstanceNode): BlockImport {
  const block = parseName(node.name);
  return {
    block: block,
    slots: detectSlots(block, node),
  }
}

function onCancel() {
  figma.closePlugin();
}

function onImport(message: FMessage) {
  console.log("test");

  const frame = figma.currentPage.findOne(node => node.name === message.frameName) as FrameNode;
  if (frame === null) {
    return;
  }

  frame.children.forEach((child: InstanceNode) => {
    if (child.name.indexOf("T:") === 0 || child.name.indexOf("S:") === 0) {
      console.log(registerBlock(child));
    }
  });
}

figma.ui.onmessage = (message: FMessage) => {
  switch (message.type) {
    case Messages.Cancel:
      return onCancel();
    case Messages.Import:
      return onImport(message);
  }
};

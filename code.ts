figma.showUI(__html__);

const SLOT_SIZE = 28;
const DIAGONAL = Math.round(Math.sqrt(SLOT_SIZE * SLOT_SIZE * 2));
const HALF_DIAGONAL = Math.round(DIAGONAL / 2);
const OFFSET = 50;
const SIZE = 400;
const FIELD_WIDTH = 10;
const AVAILABLE_ROTATIONS = [0, 90, 45, -45];

const Angle = {
  thirdQuarter: 3 * Math.PI / 2,
  secondQuarter: 3 * Math.PI / 2,
  firstQuarter: Math.PI / 2,
};

interface FMessage {
  type: Messages;
  frameName: string;
  idDiff: number;
}
enum Messages {
  Import = "import",
  Cancel = "cancel",
}

type Density = "Low" | "High";
type BuildingSize = "1x1" | "1x2" | "2x2" | "2x3" | "3x3" | "2x4" | "3x4" | "4x4";
type Rotation = 0 | 45;

enum BlockType {
  Residential = 1,
  Commercial = 2,
  Industrial = 3,
  Forest = 4,
  Park = 5,
  Agricultural = 6,
  Water = 7,
  Wasteland = 8,
}

const NameToBlockType = {
  Res: BlockType.Residential,
  Com: BlockType.Commercial,
  Ind: BlockType.Industrial,
  For: BlockType.Forest,
  Par: BlockType.Park,
  Agr: BlockType.Agricultural,
  Wat: BlockType.Water,
  Was: BlockType.Wasteland,
};

enum BlockShape {
  Square = 1,
  TriangleTopLeft = 2,
  TriangleTopRight = 3,
  TriangleBottomLeft = 4,
  TriangleBottomRight = 5,
}

interface Block {
  shape: BlockShape;
  type: BlockType;
  density: Density;
  position: number;
  postfix: string;
}

interface Point {
  x: number;
  y: number;
}

interface Slot {
  id: number;
  absolutePosition: Point;
  relativePosition: Point;
  topLeftPosition: Point;
  rotation: Rotation;
}

interface Sector {
  id: number;
  slots: Slot[];
  size: BuildingSize;
}

interface Layout {
  id: number;
  block: Block;
  sectors?: Sector[];
}

function calcTopLeftPoint(center: Point): Point {
  return {
    x: center.x - SLOT_SIZE / 2,
    y: center.y - SLOT_SIZE / 2,
  }
}

function createSlotTopDown(relativePos: Point, absolutePos: Point, index: number): Slot {
  const absolutePosition = {
    x: absolutePos.x + (SLOT_SIZE / 2) + (SLOT_SIZE * relativePos.x),
    y: absolutePos.y + (SLOT_SIZE / 2) + (SLOT_SIZE * relativePos.y),
  };

  return {
    id: index,
    relativePosition: relativePos,
    absolutePosition: absolutePosition,
    topLeftPosition: calcTopLeftPoint(absolutePosition),
    rotation: 0,
  };
}

function createSlotDiagonal(relativePos: Point, absolutePos: Point, index: number): Slot {
  const absolutePosition = {
    x: absolutePos.x + HALF_DIAGONAL + (HALF_DIAGONAL * relativePos.x) + (HALF_DIAGONAL * relativePos.y),
    y: absolutePos.y + (HALF_DIAGONAL * relativePos.y) - (HALF_DIAGONAL * relativePos.x),
  };

  return {
    id: index,
    relativePosition: relativePos,
    absolutePosition: absolutePosition,
    topLeftPosition: calcTopLeftPoint(absolutePosition),
    rotation: 45,
  };
}

function createSlotReverseDiagonal(relativePos: Point, absolutePos: Point, index: number): Slot {
  const absolutePosition = {
    x: absolutePos.x + (HALF_DIAGONAL * relativePos.x) - (HALF_DIAGONAL * relativePos.y),
    y: absolutePos.y + HALF_DIAGONAL + (HALF_DIAGONAL * relativePos.x) + (HALF_DIAGONAL * relativePos.y),
  };

  return {
    id: index,
    relativePosition: relativePos,
    absolutePosition: absolutePosition,
    topLeftPosition: calcTopLeftPoint(absolutePosition),
    rotation: 45,
  };
}

function createSlots(slotSize: BuildingSize, absolutePos: Point, rotation: number): Slot[] {
  const sizes = slotSize.toString().split('x').map(size => parseInt(size, 10));
  let width: number;
  let height: number;
  let offsetX: number;
  let offsetY: number;
  let slotCreator: (relativePos: Point, absolutePos: Point, index: number) => Slot;

  switch (rotation) {
    case 0:
      width = sizes[0];
      height = sizes[1];
      offsetX = 0;
      offsetY = 0;
      slotCreator = createSlotTopDown;
      break;

    case 90:
      width = sizes[1];
      height = sizes[0];
      offsetX = 0;
      offsetY = -SLOT_SIZE;
      slotCreator = createSlotTopDown;
      break;

    case 45:
      width = sizes[0];
      height = sizes[1];
      offsetX = 0;
      offsetY = 0;
      slotCreator = createSlotDiagonal;
      break;

    case -45:
      width = sizes[0];
      height = sizes[1];
      offsetX = 0;
      offsetY = 0;
      slotCreator = createSlotReverseDiagonal;
      break;

  }

  let index = 0;
  const slots: Slot[] = [];
  for(let x = 0; x < width; x++) {
    for(let y = 0; y < height; y++) {
      slots.push(slotCreator({x, y}, {x: absolutePos.x + offsetX, y: absolutePos.y + offsetY}, index++));
    }
  }

  return slots;
}

function detectSectors(block: Block, node: InstanceNode): Sector[] {
  const offsetX = OFFSET + ((OFFSET + SIZE) * (block.position % FIELD_WIDTH));
  const offsetY = OFFSET + ((OFFSET + SIZE) * Math.floor(block.position / FIELD_WIDTH));

  let index = 0;
  return node.children.filter(c => c.name.indexOf("Slot ") === 0).map((child: InstanceNode) => {
    const slotSize: BuildingSize = child.name.match(/Slot (\w+)/)[1] as BuildingSize;
    const currentPosition = {x: Math.round(child.x - offsetX), y: Math.round(child.y - offsetY)};

    const rotation = Math.round(child.rotation);
    if (!AVAILABLE_ROTATIONS.includes(rotation)) {
      throw new Error(`Unknown rotation ${rotation}`);
    }

    return {
      id: index++,
      slots: createSlots(slotSize, currentPosition, rotation),
      size: slotSize,
    };
  });
}

function parseName(name: string): Block {
  // <Shape>:<BlockType>_<Density>_<NNN>
  const results = name.match(/([TS]):([a-z]+)_([a-z]+)_(\d+)/i);
  const position = parseInt(results[4], 10);

  return {
    shape: results[1] === "T" ? BlockShape.TriangleBottomRight : BlockShape.Square,
    type: NameToBlockType[results[2]],
    density: results[3] as Density,
    position: position,
    postfix: "a",
  };
}

function mirror(sectors: Sector[]): Sector[] {
  return sectors.map(sector => {
    return {
      id: sector.id,
      slots: sector.slots.map(slot => {
        const absolutePosition = {x: slot.absolutePosition.y, y: slot.absolutePosition.x};

        return {
          id: slot.id,
          relativePosition: slot.relativePosition,
          absolutePosition: absolutePosition,
          topLeftPosition: calcTopLeftPoint(absolutePosition),
          rotation: slot.rotation,
        };
      }),
      size: sector.size,
    };
  });
}

function rotate(sectors: Sector[], angle: number, offset: Point): Sector[] {
  return sectors.map(sector => {
    return {
      id: sector.id,
      slots: sector.slots.map(slot => {
        const x = slot.absolutePosition.x;
        const y = slot.absolutePosition.y;

        const absolutePosition = {
          x: Math.round(x * Math.cos(angle) + (y * Math.sin(angle))) + offset.x,
          y: Math.round(-(x * Math.sin(angle) + (y * Math.cos(angle)))) + offset.y,
        };

        return {
          id: slot.id,
          relativePosition: slot.relativePosition,
          absolutePosition: absolutePosition,
          topLeftPosition: calcTopLeftPoint(absolutePosition),
          rotation: slot.rotation,
        };
      }),
      size: sector.size,
    };
  });
}

function copyBlock(originalBlock: Block, shape: BlockShape, postfix: string): Block {
  return {
    shape,
    type: originalBlock.type,
    density: originalBlock.density,
    position: originalBlock.position,
    postfix,
  };
}

function registerBlock(node: InstanceNode): Layout[] {
  const originalBlock = parseName(node.name);
  const originalSectors = detectSectors(originalBlock, node);

  const isSquare = originalBlock.shape === BlockShape.Square;
  const shapes = isSquare ?
    [BlockShape.Square, BlockShape.Square, BlockShape.Square] :
    [BlockShape.TriangleBottomLeft, BlockShape.TriangleTopLeft, BlockShape.TriangleTopRight];

  const mirrorBlock = copyBlock(originalBlock, isSquare ? BlockShape.Square : BlockShape.TriangleBottomRight, "a_mirror");
  const mirrorSectors = mirror(originalSectors);
  const thirdQuarterSectors = rotate(originalSectors, Angle.thirdQuarter, {x: SIZE, y: 0});
  const thirdQuarterSectorsMirrored = rotate(mirrorSectors, Angle.thirdQuarter, {x: SIZE, y: 0});

  return [
    {
      id: LAYOUT_ID++,
      block: originalBlock,
      sectors: originalSectors,
    },
    {
      id: LAYOUT_ID++,
      block: mirrorBlock,
      sectors: mirrorSectors,
    },
    {
      id: LAYOUT_ID++,
      block: copyBlock(originalBlock, shapes[0], "b"),
      sectors: thirdQuarterSectors,
    },
    {
      id: LAYOUT_ID++,
      block: copyBlock(mirrorBlock, shapes[0], "b_mirror"),
      sectors: thirdQuarterSectorsMirrored,
    },
    {
      id: LAYOUT_ID++,
      block: copyBlock(originalBlock, shapes[1], "c"),
      sectors: rotate(thirdQuarterSectors, Angle.secondQuarter, {x: SIZE, y: 0}),
    },
    {
      id: LAYOUT_ID++,
      block: copyBlock(mirrorBlock, shapes[1], "c_mirror"),
      sectors: rotate(thirdQuarterSectorsMirrored, Angle.secondQuarter, {x: SIZE, y: 0}),
    },
    {
      id: LAYOUT_ID++,
      block: copyBlock(originalBlock, shapes[2], "d"),
      sectors: rotate(originalSectors, Angle.firstQuarter, {x: 0, y: SIZE}),
    },
    {
      id: LAYOUT_ID++,
      block: copyBlock(mirrorBlock, shapes[2], "d_mirror"),
      sectors: rotate(mirrorSectors, Angle.firstQuarter, {x: 0, y: SIZE}),
    },
  ]
}

function onCancel() {
  figma.closePlugin();
}

const ARTBOARD_ID_COUNT = 10 * 6 * 8;
let LAYOUT_ID;

function onImport(message: FMessage) {
  const frame = figma.currentPage.findOne(node => node.name === message.frameName) as FrameNode;
  if (frame === null) {
    return;
  }

  const blocks: Layout[] = [];
  LAYOUT_ID = ARTBOARD_ID_COUNT * message.idDiff;

  frame.children.forEach((child: InstanceNode) => {
    if (child.name.indexOf("T:") === 0 || child.name.indexOf("S:") === 0) {
      blocks.push(...registerBlock(child));
    }
  });

  console.log(JSON.stringify(blocks));

  onCancel();
}

figma.ui.onmessage = (message: FMessage) => {
  switch (message.type) {
    case Messages.Cancel:
      return onCancel();
    case Messages.Import:
      return onImport(message);
  }
};

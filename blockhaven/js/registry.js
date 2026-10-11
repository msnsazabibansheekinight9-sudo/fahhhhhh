// Blocks, items, crafting recipes, smelting and fuel.
(function () {
  'use strict';
  const BLOCKS = [], ITEMS = [], ID = {};

  function B(key, name, tex, o) {
    o = o || {};
    const id = BLOCKS.length;
    const t = typeof tex === 'string' ? { top: tex, bottom: tex, side: tex } : Object.assign({ top: tex.side, bottom: tex.top || tex.side }, tex);
    if (!t.front) t.front = t.side;
    const b = Object.assign({
      id, key, name, tex: t, hardness: 1, tool: null, tier: -1, solid: true, transparent: false, cutout: false,
      liquid: false, cross: false, light: 0, tint: null, replaceable: false, gravity: false, support: false,
      orient: false, drop: key, interact: null, sound: 'stone',
    }, o);
    BLOCKS.push(b);
    ID[key] = id;
    ITEMS[id] = { id, key, name, block: id, stack: o.stack || 64, fuel: o.fuel || 0 };
    return b;
  }
  const W = { tool: 'axe', sound: 'wood' }, S = { tool: 'pickaxe', tier: 0 }, D = { tool: 'shovel', sound: 'dirt' };
  const PLANT = { solid: false, transparent: true, cutout: true, cross: true, hardness: 0, replaceable: false, support: true, sound: 'grass' };
  const LEAF = { hardness: 0.2, transparent: true, cutout: true, tool: 'hoe', sound: 'grass', leaves: true, drop: null };

  B('air', 'Air', 'stone', { solid: false, transparent: true, hardness: 0 });
  B('stone', 'Stone', 'stone', Object.assign({ hardness: 1.5, drop: 'cobble' }, S));
  B('grass', 'Grass Block', { top: 'grass_top', side: 'grass_side', bottom: 'dirt' }, Object.assign({ hardness: 0.6, drop: 'dirt', tintTop: 'grass', sound: 'grass' }, D));
  B('dirt', 'Dirt', 'dirt', Object.assign({ hardness: 0.5 }, D));
  B('cobble', 'Cobblestone', 'cobble', Object.assign({ hardness: 2 }, S));
  B('oak_planks', 'Oak Planks', 'oak_planks', Object.assign({ hardness: 2, fuel: 15, planks: true }, W));
  B('bedrock', 'Bedrock', 'bedrock', { hardness: -1, drop: null });
  B('sand', 'Sand', 'sand', Object.assign({ hardness: 0.5, gravity: true, sound: 'sand' }, D));
  B('gravel', 'Gravel', 'gravel', Object.assign({ hardness: 0.6, gravity: true, drop: 'gravel' }, D));
  B('oak_log', 'Oak Log', { top: 'oak_log_top', side: 'oak_log' }, Object.assign({ hardness: 2, fuel: 15, log: 'oak_planks' }, W));
  B('oak_leaves', 'Oak Leaves', 'oak_leaves', Object.assign({ tint: 'foliage', apple: true, leafOf: 'oak' }, LEAF));
  B('glass', 'Glass', 'glass', { hardness: 0.3, transparent: true, cutout: true, drop: null, sound: 'glass' });
  B('coal_ore', 'Coal Ore', 'coal_ore', Object.assign({ hardness: 3, drop: 'coal' }, S));
  B('iron_ore', 'Iron Ore', 'iron_ore', { hardness: 3, tool: 'pickaxe', tier: 1, drop: 'raw_iron' });
  B('gold_ore', 'Gold Ore', 'gold_ore', { hardness: 3, tool: 'pickaxe', tier: 2, drop: 'raw_gold' });
  B('diamond_ore', 'Diamond Ore', 'diamond_ore', { hardness: 3, tool: 'pickaxe', tier: 2, drop: 'diamond' });
  B('copper_ore', 'Copper Ore', 'copper_ore', { hardness: 3, tool: 'pickaxe', tier: 1, drop: 'raw_copper', dropN: [2, 4] });
  B('lapis_ore', 'Lapis Ore', 'lapis_ore', { hardness: 3, tool: 'pickaxe', tier: 1, drop: 'lapis', dropN: [3, 6] });
  B('cinnabar_ore', 'Cinnabar Ore', 'cinnabar_ore', { hardness: 3, tool: 'pickaxe', tier: 2, drop: 'cinnabar', dropN: [3, 5] });
  B('emerald_ore', 'Emerald Ore', 'emerald_ore', { hardness: 3, tool: 'pickaxe', tier: 2, drop: 'emerald' });
  B('water', 'Water', 'water', { solid: false, transparent: true, liquid: true, hardness: -1, drop: null, tint: 'water', replaceable: true });
  B('lava', 'Lava', 'lava', { solid: false, transparent: false, liquid: true, hardness: -1, drop: null, light: 15, replaceable: true });
  B('birch_log', 'Birch Log', { top: 'birch_log_top', side: 'birch_log' }, Object.assign({ hardness: 2, fuel: 15, log: 'birch_planks' }, W));
  B('birch_leaves', 'Birch Leaves', 'birch_leaves', Object.assign({ leafOf: 'birch' }, LEAF));
  B('spruce_log', 'Spruce Log', { top: 'spruce_log_top', side: 'spruce_log' }, Object.assign({ hardness: 2, fuel: 15, log: 'spruce_planks' }, W));
  B('spruce_leaves', 'Spruce Leaves', 'spruce_leaves', Object.assign({ leafOf: 'spruce' }, LEAF));
  B('jungle_log', 'Jungle Log', { top: 'jungle_log_top', side: 'jungle_log' }, Object.assign({ hardness: 2, fuel: 15, log: 'jungle_planks' }, W));
  B('jungle_leaves', 'Jungle Leaves', 'jungle_leaves', Object.assign({ tint: 'foliage', leafOf: 'jungle' }, LEAF));
  B('acacia_log', 'Acacia Log', { top: 'acacia_log_top', side: 'acacia_log' }, Object.assign({ hardness: 2, fuel: 15, log: 'acacia_planks' }, W));
  B('acacia_leaves', 'Acacia Leaves', 'acacia_leaves', Object.assign({ tint: 'foliage', leafOf: 'acacia' }, LEAF));
  B('dark_oak_log', 'Dark Oak Log', { top: 'dark_oak_log_top', side: 'dark_oak_log' }, Object.assign({ hardness: 2, fuel: 15, log: 'dark_oak_planks' }, W));
  B('dark_oak_leaves', 'Dark Oak Leaves', 'dark_oak_leaves', Object.assign({ tint: 'foliage', apple: true, leafOf: 'dark_oak' }, LEAF));
  ['birch', 'spruce', 'jungle', 'acacia', 'dark_oak'].forEach(w => B(w + '_planks', w.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase()) + ' Planks', w + '_planks', Object.assign({ hardness: 2, fuel: 15, planks: true }, W)));
  B('sandstone', 'Sandstone', { top: 'sandstone_top', side: 'sandstone_side', bottom: 'sandstone_bottom' }, Object.assign({ hardness: 0.8 }, S));
  B('snow_block', 'Snow Block', 'snow', { hardness: 0.2, tool: 'shovel', drop: 'snowball', dropN: [4, 4], sound: 'snow' });
  B('snowy_grass', 'Snowy Grass Block', { top: 'snow', side: 'snow_grass_side', bottom: 'dirt' }, Object.assign({ hardness: 0.6, drop: 'dirt' }, D));
  B('ice', 'Ice', 'ice', { hardness: 0.5, tool: 'pickaxe', transparent: true, drop: null, sound: 'glass', slippery: true });
  B('packed_ice', 'Packed Ice', 'packed_ice', { hardness: 0.5, tool: 'pickaxe', drop: null, sound: 'glass', slippery: true });
  B('clay', 'Clay', 'clay', Object.assign({ hardness: 0.6, drop: 'clay_ball', dropN: [4, 4] }, D));
  B('terracotta', 'Terracotta', 'terracotta', Object.assign({ hardness: 1.25 }, S));
  B('red_sand', 'Red Sand', 'red_sand', Object.assign({ hardness: 0.5, gravity: true, sound: 'sand' }, D));
  B('terracotta_orange', 'Orange Terracotta', 'terracotta_orange', Object.assign({ hardness: 1.25 }, S));
  B('terracotta_yellow', 'Yellow Terracotta', 'terracotta_yellow', Object.assign({ hardness: 1.25 }, S));
  B('terracotta_brown', 'Brown Terracotta', 'terracotta_brown', Object.assign({ hardness: 1.25 }, S));
  B('terracotta_white', 'White Terracotta', 'terracotta_white', Object.assign({ hardness: 1.25 }, S));
  B('terracotta_red', 'Red Terracotta', 'terracotta_red', Object.assign({ hardness: 1.25 }, S));
  B('cactus', 'Cactus', { top: 'cactus_top', side: 'cactus_side' }, { hardness: 0.4, transparent: true, cutout: true, cactus: true, support: true, sound: 'wood' });
  B('tall_grass', 'Short Grass', 'tall_grass', Object.assign({}, PLANT, { tint: 'grass', replaceable: true, drop: 'seeds', dropChance: 0.125 }));
  B('dandelion', 'Dandelion', 'dandelion', PLANT);
  B('poppy', 'Poppy', 'poppy', PLANT);
  B('blue_orchid', 'Blue Orchid', 'blue_orchid', PLANT);
  B('cornflower', 'Cornflower', 'cornflower', PLANT);
  B('dead_bush', 'Dead Bush', 'dead_bush', Object.assign({}, PLANT, { replaceable: true, drop: 'stick', dropN: [0, 2] }));
  B('red_mushroom', 'Red Mushroom', 'red_mushroom', Object.assign({}, PLANT, { light: 0 }));
  B('brown_mushroom', 'Brown Mushroom', 'brown_mushroom', Object.assign({}, PLANT, { light: 1 }));
  B('sugar_cane', 'Sugar Cane', 'sugar_cane', Object.assign({}, PLANT, { cane: true }));
  B('fern', 'Fern', 'fern', Object.assign({}, PLANT, { tint: 'grass', replaceable: true, drop: 'seeds', dropChance: 0.125 }));
  B('mushroom_block', 'Red Mushroom Block', 'mushroom_red_block', { hardness: 0.2, tool: 'axe', drop: 'red_mushroom', dropChance: 0.3, sound: 'wood' });
  B('mushroom_stem', 'Mushroom Stem', 'mushroom_stem', { hardness: 0.2, tool: 'axe', drop: null, sound: 'wood' });
  B('mycelium', 'Mycelium', { top: 'mycelium_top', side: 'mycelium_side', bottom: 'dirt' }, Object.assign({ hardness: 0.6, drop: 'dirt' }, D));
  B('podzol', 'Podzol', { top: 'podzol_top', side: 'podzol_side', bottom: 'dirt' }, Object.assign({ hardness: 0.5, drop: 'dirt' }, D));
  B('crafting_table', 'Crafting Table', { top: 'crafting_top', side: 'crafting_side', front: 'crafting_front', bottom: 'oak_planks' }, Object.assign({ hardness: 2.5, interact: 'craft', orient: true, fuel: 15 }, W));
  B('furnace', 'Furnace', { top: 'furnace_top', side: 'furnace_side', front: 'furnace_front' }, Object.assign({ hardness: 3.5, interact: 'furnace', orient: true }, S));
  B('furnace_lit', 'Lit Furnace', { top: 'furnace_top', side: 'furnace_side', front: 'furnace_front_lit' }, Object.assign({ hardness: 3.5, interact: 'furnace', orient: true, light: 13, drop: 'furnace', hidden: true }, S));
  B('chest', 'Chest', { top: 'chest_top', side: 'chest_side', front: 'chest_front' }, Object.assign({ hardness: 2.5, interact: 'chest', orient: true }, W));
  B('torch', 'Torch', 'torch', Object.assign({}, PLANT, { light: 14, torch: true, sound: 'wood' }));
  B('bricks', 'Bricks', 'bricks', Object.assign({ hardness: 2 }, S));
  B('stone_bricks', 'Stone Bricks', 'stone_bricks', Object.assign({ hardness: 1.5 }, S));
  B('mossy_cobble', 'Mossy Cobblestone', 'mossy_cobble', Object.assign({ hardness: 2 }, S));
  B('obsidian', 'Obsidian', 'obsidian', { hardness: 50, tool: 'pickaxe', tier: 3 });
  B('tnt', 'TNT', { top: 'tnt_top', side: 'tnt_side', bottom: 'tnt_bottom' }, { hardness: 0, interact: 'tnt', sound: 'grass' });
  B('bookshelf', 'Bookshelf', { top: 'oak_planks', side: 'bookshelf' }, Object.assign({ hardness: 1.5, drop: 'book', dropN: [3, 3], fuel: 15 }, W));
  BH.WOOL_COLORS.forEach(c => B('wool_' + c, c.replace('_', ' ').replace(/\b\w/g, x => x.toUpperCase()) + ' Wool', 'wool_' + c, { hardness: 0.8, tool: 'shears', sound: 'cloth', fuel: 5, wool: c }));
  B('farmland', 'Farmland', { top: 'farmland', side: 'dirt' }, Object.assign({ hardness: 0.6, drop: 'dirt', hidden: true }, D));
  for (let s = 0; s < 4; s++) B('wheat_' + s, 'Wheat Crop', 'wheat_' + s, Object.assign({}, PLANT, { crop: s, drop: s === 3 ? 'wheat' : 'seeds', hidden: true }));
  B('pumpkin', 'Pumpkin', { top: 'pumpkin_top', side: 'pumpkin_side' }, Object.assign({ hardness: 1 }, W));
  B('jack_o_lantern', 'Lantern Pumpkin', { top: 'pumpkin_top', side: 'pumpkin_side', front: 'pumpkin_face' }, Object.assign({ hardness: 1, light: 15, orient: true }, W));
  B('melon', 'Melon', { top: 'melon_top', side: 'melon_side' }, Object.assign({ hardness: 1, drop: 'melon_slice', dropN: [3, 7] }, W));
  B('hay_bale', 'Hay Bale', { top: 'hay_top', side: 'hay_side' }, { hardness: 0.5, tool: 'hoe', sound: 'grass' });
  B('coal_block', 'Block of Coal', 'block_coal', Object.assign({ hardness: 5, fuel: 800 }, S));
  B('iron_block', 'Block of Iron', 'block_iron', { hardness: 5, tool: 'pickaxe', tier: 1 });
  B('gold_block', 'Block of Gold', 'block_gold', { hardness: 3, tool: 'pickaxe', tier: 2 });
  B('diamond_block', 'Block of Diamond', 'block_diamond', { hardness: 5, tool: 'pickaxe', tier: 2 });
  B('emerald_block', 'Block of Emerald', 'block_emerald', { hardness: 5, tool: 'pickaxe', tier: 2 });
  B('lapis_block', 'Block of Lapis', 'block_lapis', { hardness: 3, tool: 'pickaxe', tier: 1 });
  B('copper_block', 'Block of Copper', 'block_copper', { hardness: 3, tool: 'pickaxe', tier: 1 });
  B('cinnabar_block', 'Block of Cinnabar', 'block_cinnabar', Object.assign({ hardness: 5, light: 7 }, S));
  B('bed', 'Bed', { top: 'bed_top', side: 'bed_side', bottom: 'oak_planks' }, Object.assign({ hardness: 0.2, interact: 'bed', orient: true, sound: 'cloth' }, W));
  B('lamp', 'Glow Lamp', 'lamp', { hardness: 0.3, light: 15, sound: 'glass' });
  B('andesite', 'Andesite', 'andesite', Object.assign({ hardness: 1.5 }, S));
  B('diorite', 'Diorite', 'diorite', Object.assign({ hardness: 1.5 }, S));
  B('granite', 'Granite', 'granite', Object.assign({ hardness: 1.5 }, S));
  B('slate', 'Slate', 'slate', Object.assign({ hardness: 3 }, S));
  B('slate_diamond_ore', 'Slate Diamond Ore', 'slate_ore_diamond', { hardness: 4.5, tool: 'pickaxe', tier: 2, drop: 'diamond' });
  B('tuff', 'Tuff', 'tuff', Object.assign({ hardness: 1.5 }, S));
  B('calcite', 'Calcite', 'calcite', Object.assign({ hardness: 0.75 }, S));
  B('moss_block', 'Moss Block', 'moss', { hardness: 0.1, tool: 'hoe', sound: 'grass' });
  B('coarse_dirt', 'Coarse Dirt', 'coarse_dirt', Object.assign({ hardness: 0.5 }, D));
  B('mud', 'Mud', 'mud', Object.assign({ hardness: 0.5 }, D));
  B('smooth_stone', 'Smooth Stone', 'smooth_stone', Object.assign({ hardness: 2 }, S));
  B('cut_sandstone', 'Cut Sandstone', 'cut_sandstone', Object.assign({ hardness: 0.8 }, S));
  B('grass_path', 'Dirt Path', { top: 'grass_path', side: 'dirt' }, Object.assign({ hardness: 0.6, drop: 'dirt' }, D));
  B('ladder', 'Ladder', 'ladder', { hardness: 0.4, tool: 'axe', solid: false, transparent: true, cutout: true, cross: true, climb: true, fuel: 15, sound: 'wood' });
  B('barrel', 'Barrel', { top: 'barrel_top', side: 'barrel_side' }, Object.assign({ hardness: 2.5, interact: 'chest' }, W));
  B('pumpkin_crop', 'Pumpkin', 'pumpkin_side', { hidden: true, drop: 'pumpkin' });

  [['oak', 'Oak', 'oak'], ['birch', 'Birch', 'birch'], ['spruce', 'Spruce', 'spruce'], ['jungle', 'Jungle', 'jungle'], ['acacia', 'Acacia', 'acacia'], ['dark_oak', 'Dark Oak', 'dark_oak']].forEach(([k, n, tree]) => B('sapling_' + k, n + ' Sapling', 'sapling_' + k, Object.assign({}, PLANT, { sapling: tree, fuel: 5 })));
  // ---------- Cinderdeep
  const ASH = { tool: 'pickaxe', tier: 0 };
  B('ashrock', 'Ashrock', 'ashrock', Object.assign({ hardness: 0.4 }, ASH));
  B('ember_ore', 'Ember Ore', 'ember_ore', Object.assign({ hardness: 3, drop: 'ember_shard', dropN: [1, 2] }, ASH));
  B('cinder_gold_ore', 'Cinder Gold Ore', 'cinder_gold_ore', Object.assign({ hardness: 3, drop: 'raw_gold' }, ASH));
  B('duskiron_ore', 'Duskiron Ore', { top: 'duskiron_ore', side: 'duskiron_ore' }, { hardness: 30, tool: 'pickaxe', tier: 3, drop: 'duskiron_scrap' });
  B('gloomsand', 'Gloomsand', 'gloomsand', Object.assign({ hardness: 0.5, slow: true, sound: 'sand' }, D));
  B('sunstone', 'Sunstone', 'sunstone', { hardness: 0.3, light: 15, drop: 'glow_dust', dropN: [2, 4], sound: 'glass' });
  B('basalt', 'Basalt', { top: 'basalt_top', side: 'basalt_side' }, Object.assign({ hardness: 1.25 }, S));
  B('scorch_block', 'Scorch Block', 'scorch_block', Object.assign({ hardness: 0.5, light: 3, hot: true }, S));
  B('emberwood_stem', 'Emberwood Stem', { top: 'emberwood_top', side: 'emberwood_stem' }, Object.assign({ hardness: 2, log: 'emberwood_planks' }, W));
  B('emberwood_planks', 'Emberwood Planks', 'emberwood_planks', Object.assign({ hardness: 2, planks: true }, W));
  B('ember_cap', 'Ember Cap Block', 'ember_cap', { hardness: 1, tool: 'hoe', sound: 'grass' });
  B('glowshroom', 'Glowshroom', 'glowshroom', Object.assign({}, PLANT, { light: 10 }));
  B('cinder_bricks', 'Cinder Bricks', 'cinder_bricks', Object.assign({ hardness: 2 }, S));
  B('ash_soil', 'Ash Soil', { top: 'ash_soil_top', side: 'ash_soil_side', bottom: 'ashrock' }, Object.assign({ hardness: 0.4, drop: 'ashrock' }, ASH));
  B('ember_gate', 'Ember Gate', 'ember_gate', { solid: false, transparent: true, hardness: -1, drop: null, light: 11, portal: 'cinder', hidden: true, cutout: true, gate: true });
  B('monster_cage', 'Monster Cage', 'monster_cage', { hardness: 5, tool: 'pickaxe', tier: 0, transparent: true, cutout: true, drop: null });
  // ---------- the Hollow
  B('voidstone', 'Voidstone', 'voidstone', Object.assign({ hardness: 3 }, S));
  B('voidstone_bricks', 'Voidstone Bricks', 'voidstone_bricks', Object.assign({ hardness: 3 }, S));
  B('lumen_tile', 'Lumen Tile', 'lumen_tile', Object.assign({ hardness: 1.5 }, S));
  B('rift_frame', 'Rift Frame', { top: 'rift_frame_top', side: 'rift_frame_side' }, { hardness: -1, drop: null, frame: true });
  B('rift_frame_eye', 'Rift Frame (Eye)', { top: 'rift_frame_eye', side: 'rift_frame_side' }, { hardness: -1, drop: null, frame: true, hidden: true, light: 1 });
  B('rift_portal', 'Rift', 'rift_portal', { solid: false, transparent: false, hardness: -1, drop: null, light: 15, portal: 'hollow', hidden: true, flat: true });
  B('drift_bloom', 'Drift Bloom', 'drift_bloom', Object.assign({}, PLANT, { drop: 'drift_fruit', dropN: [1, 2], light: 4 }));
  B('hollow_lantern', 'Hollow Lantern', 'hollow_lantern', Object.assign({}, PLANT, { light: 14, torch: true }));
  // ---------- structure blocks
  B('mossy_stone_bricks', 'Mossy Stone Bricks', 'mossy_stone_bricks', Object.assign({ hardness: 1.5 }, S));
  B('cracked_stone_bricks', 'Cracked Stone Bricks', 'cracked_stone_bricks', Object.assign({ hardness: 1.5 }, S));
  B('chiseled_sandstone', 'Chiseled Sandstone', 'chiseled_sandstone', Object.assign({ hardness: 0.8 }, S));
  B('bell', 'Bell', 'bell', { hardness: 5, tool: 'pickaxe', cross: true, transparent: true, cutout: true, solid: true, sound: 'metal' });
  B('exit_portal', 'Return Rift', 'rift_portal', { solid: false, hardness: -1, drop: null, light: 15, portal: 'home', hidden: true, flat: true });

  // ---------- items
  function It(key, name, o) {
    const id = 256 + ITEMS.filter((x, i) => i >= 256).length;
    const it = Object.assign({ id, key, name, icon: key, stack: 64, fuel: 0 }, o || {});
    ITEMS[id] = it;
    ID[key] = id;
    return it;
  }
  const food = (k, n, h, sat, o) => It(k, n, Object.assign({ food: h, sat: sat || h * 0.6 }, o || {}));
  It('stick', 'Stick', { fuel: 5 });
  It('coal', 'Coal', { fuel: 80 });
  It('charcoal', 'Charcoal', { fuel: 80 });
  It('iron_ingot', 'Iron Ingot'); It('gold_ingot', 'Gold Ingot'); It('copper_ingot', 'Copper Ingot');
  It('diamond', 'Diamond'); It('emerald', 'Emerald'); It('lapis', 'Lapis Lazuli'); It('cinnabar', 'Cinnabar Dust');
  It('raw_iron', 'Raw Iron'); It('raw_gold', 'Raw Gold'); It('raw_copper', 'Raw Copper');
  It('flint', 'Flint'); It('feather', 'Feather'); It('string', 'String'); It('bone', 'Bone'); It('bone_meal', 'Bone Meal');
  It('gunpowder', 'Gunpowder'); It('leather', 'Leather'); It('seeds', 'Wheat Seeds', { places: 'wheat_0', onBlock: 'farmland' });
  It('wheat', 'Wheat'); It('sugar', 'Sugar'); It('paper', 'Paper'); It('book', 'Book'); It('bowl', 'Bowl', { fuel: 5 });
  It('clay_ball', 'Clay Ball'); It('brick', 'Brick'); It('snowball', 'Snowball', { stack: 16, throwable: true });
  It('slimeball', 'Bog Gel', { icon: 'slimeball' }); It('glow_dust', 'Glow Dust'); It('beetle_shell', 'Beetle Shell'); It('wisp_essence', 'Wisp Essence');
  It('ember_shard', 'Ember Shard'); It('duskiron_scrap', 'Duskiron Scrap', { fireproof: true }); It('duskiron_ingot', 'Duskiron Ingot', { fireproof: true });
  It('ember_rod', 'Ember Rod', { fuel: 120 }); It('ember_dust', 'Ember Dust');
  It('drift_pearl', 'Drift Pearl', { stack: 16, throwable: true });
  It('seeker_eye', 'Seeker Eye', { throwable: true });
  food('drift_fruit', 'Drift Fruit', 4, 2.4, { teleport: true });
  It('warden_heart', "Warden's Heart", { stack: 1 });
  It('wraith_skull', 'Wraith Skull'); It('fire_charge', 'Fire Charge', { igniter: true });
  It('name_tag', 'Name Tag');
  It('egg', 'Egg', { stack: 16, throwable: true });
  food('apple', 'Apple', 4); food('golden_apple', 'Golden Apple', 4, 9.6, { regen: 5 }); food('bread', 'Bread', 5);
  food('porkchop', 'Raw Porkchop', 3); food('cooked_porkchop', 'Cooked Porkchop', 8, 12.8);
  food('beef', 'Raw Beef', 3); food('steak', 'Steak', 8, 12.8);
  food('chicken', 'Raw Chicken', 2, 1.2, { poison: 0.3 }); food('cooked_chicken', 'Cooked Chicken', 6, 7.2);
  food('mutton', 'Raw Mutton', 2); food('cooked_mutton', 'Cooked Mutton', 6, 9.6);
  food('rotten_flesh', 'Rotten Flesh', 4, 0.8, { poison: 0.8 });
  food('mushroom_stew', 'Mushroom Stew', 6, 7.2, { stack: 1, leaves: 'bowl' });
  food('melon_slice', 'Melon Slice', 2); food('pumpkin_pie', 'Pumpkin Pie', 8, 4.8); food('cookie', 'Cookie', 2, 0.4);
  food('carrot', 'Carrot', 3); food('potato', 'Potato', 1); food('baked_potato', 'Baked Potato', 5, 6);
  It('bucket', 'Bucket', { stack: 16 });
  It('water_bucket', 'Water Bucket', { stack: 1, places: 'water', leaves: 'bucket' });
  It('lava_bucket', 'Lava Bucket', { stack: 1, places: 'lava', leaves: 'bucket', fuel: 1000 });
  It('milk_bucket', 'Milk Bucket', { stack: 1, food: 0, sat: 0, leaves: 'bucket', cure: true });
  It('bow', 'Bow', { stack: 1, bow: true, dur: 384 });
  It('arrow', 'Arrow');
  It('flint_steel', 'Flint and Steel', { stack: 1, dur: 64, igniter: true });
  It('shears', 'Shears', { stack: 1, dur: 238, tool: { type: 'shears', tier: 1, speed: 5, dmg: 1 } });
  It('compass', 'Compass', { stack: 1, compass: true });

  const TIERS = {
    wood: { name: 'Wooden', tier: 0, speed: 2, dur: 59, dmg: 4, fuel: 10 },
    stone: { name: 'Stone', tier: 1, speed: 4, dur: 131, dmg: 5 },
    copper: { name: 'Copper', tier: 1, speed: 5, dur: 190, dmg: 5 },
    iron: { name: 'Iron', tier: 2, speed: 6, dur: 250, dmg: 6 },
    gold: { name: 'Golden', tier: 0, speed: 12, dur: 32, dmg: 4 },
    diamond: { name: 'Diamond', tier: 3, speed: 8, dur: 1561, dmg: 7 },
    duskiron: { name: 'Duskiron', tier: 4, speed: 9, dur: 2031, dmg: 8 },
  };
  const TOOLS = { sword: { n: 'Sword', d: 0, cd: 0.6 }, pickaxe: { n: 'Pickaxe', d: -2, cd: 0.85 }, axe: { n: 'Axe', d: 1, cd: 1.0 }, shovel: { n: 'Shovel', d: -2.5, cd: 1.0 }, hoe: { n: 'Hoe', d: -3, cd: 0.5 } };
  Object.keys(TIERS).forEach(m => Object.keys(TOOLS).forEach(t => {
    const T = TIERS[m], X = TOOLS[t];
    It(m + '_' + t, T.name + ' ' + X.n, { stack: 1, dur: T.dur, fuel: T.fuel || 0, tool: { type: t, tier: T.tier, speed: T.speed, dmg: Math.max(1, T.dmg + X.d), cd: X.cd } });
  }));
  const ARMOR = {
    leather: { name: 'Leather', p: [1, 3, 2, 1], dur: 5 }, chain: { name: 'Chainmail', p: [2, 5, 4, 1], dur: 15 },
    copper: { name: 'Copper', p: [2, 4, 3, 1], dur: 11 }, iron: { name: 'Iron', p: [2, 6, 5, 2], dur: 15 },
    gold: { name: 'Golden', p: [2, 5, 3, 1], dur: 7 }, diamond: { name: 'Diamond', p: [3, 8, 6, 3], dur: 33 }, duskiron: { name: 'Duskiron', p: [3, 8, 6, 3], dur: 37, tough: 1 },
  };
  const SLOTS = [['helmet', 'Helmet', 11], ['chestplate', 'Chestplate', 16], ['leggings', 'Leggings', 15], ['boots', 'Boots', 13]];
  Object.keys(ARMOR).forEach(m => SLOTS.forEach((s, i) => {
    const key = m + '_' + s[0];
    It(key, ARMOR[m].name + ' ' + (m === 'leather' && s[0] === 'helmet' ? 'Cap' : m === 'leather' && s[0] === 'chestplate' ? 'Tunic' : m === 'leather' && s[0] === 'leggings' ? 'Pants' : s[1]), { stack: 1, dur: ARMOR[m].dur * s[2], armor: { slot: i, points: ARMOR[m].p[i] } });
  }));
  It('drift_cloak', 'Drift Cloak', { stack: 1, dur: 432, armor: { slot: 1, points: 1 }, slowfall: true });
  const DYE_SRC = {};
  BH.WOOL_COLORS.forEach(c => { It(c + '_dye', c.replace('_', ' ').replace(/\b\w/g, x => x.toUpperCase()) + ' Dye', { dye: c }); });

  // ---------- recipes
  const R = [];
  const shaped = (out, n, shape, keys) => R.push({ out, n, shape, keys });
  const shapeless = (out, n, ing) => R.push({ out, n, ing });
  BLOCKS.forEach(b => { if (b.log) shapeless(b.log, 4, [b.key]); });
  shaped('stick', 4, ['P', 'P'], { P: '#planks' });
  shaped('crafting_table', 1, ['PP', 'PP'], { P: '#planks' });
  shaped('furnace', 1, ['CCC', 'C C', 'CCC'], { C: '#stone_craft' });
  shaped('chest', 1, ['PPP', 'P P', 'PPP'], { P: '#planks' });
  shaped('barrel', 1, ['PSP', 'P P', 'PSP'], { P: '#planks', S: 'stick' });
  shaped('torch', 4, ['C', 'S'], { C: '#coal', S: 'stick' });
  shaped('ladder', 3, ['S S', 'SSS', 'S S'], { S: 'stick' });
  shaped('bed', 1, ['WWW', 'PPP'], { W: '#wool', P: '#planks' });
  shaped('bowl', 4, ['P P', ' P '], { P: '#planks' });
  shaped('bricks', 1, ['BB', 'BB'], { B: 'brick' });
  shaped('stone_bricks', 4, ['SS', 'SS'], { S: 'stone' });
  shaped('sandstone', 1, ['SS', 'SS'], { S: 'sand' });
  shaped('cut_sandstone', 4, ['SS', 'SS'], { S: 'sandstone' });
  shaped('snow_block', 1, ['SS', 'SS'], { S: 'snowball' });
  shaped('clay', 1, ['CC', 'CC'], { C: 'clay_ball' });
  shaped('tnt', 1, ['GSG', 'SGS', 'GSG'], { G: 'gunpowder', S: '#sand' });
  shaped('bookshelf', 1, ['PPP', 'BBB', 'PPP'], { P: '#planks', B: 'book' });
  shaped('paper', 3, ['CCC'], { C: 'sugar_cane' });
  shapeless('book', 1, ['paper', 'paper', 'paper', 'leather']);
  shapeless('sugar', 1, ['sugar_cane']);
  shaped('bread', 1, ['WWW'], { W: 'wheat' });
  shaped('hay_bale', 1, ['WWW', 'WWW', 'WWW'], { W: 'wheat' });
  shapeless('wheat', 9, ['hay_bale']);
  shaped('cookie', 8, ['WCW'], { W: 'wheat', C: 'brown_dye' });
  shapeless('mushroom_stew', 1, ['red_mushroom', 'brown_mushroom', 'bowl']);
  shapeless('pumpkin_pie', 1, ['pumpkin', 'sugar', 'egg']);
  shaped('golden_apple', 1, ['GGG', 'GAG', 'GGG'], { G: 'gold_ingot', A: 'apple' });
  shaped('melon', 1, ['MMM', 'MMM', 'MMM'], { M: 'melon_slice' });
  shapeless('jack_o_lantern', 1, ['pumpkin', 'torch']);
  shaped('bucket', 1, ['I I', ' I '], { I: 'iron_ingot' });
  shaped('bow', 1, [' SX', 'S X', ' SX'], { S: 'stick', X: 'string' });
  shaped('arrow', 4, ['F', 'S', 'E'], { F: 'flint', S: 'stick', E: 'feather' });
  shapeless('flint_steel', 1, ['iron_ingot', 'flint']);
  shaped('shears', 1, [' I', 'I '], { I: 'iron_ingot' });
  shaped('compass', 1, [' I ', 'ICI', ' I '], { I: 'iron_ingot', C: 'cinnabar' });
  shaped('glass', 0, [], {}); R.pop();
  shaped('lamp', 1, ['GGG', 'GTG', 'GGG'], { G: 'glass', T: 'glow_dust' });
  shaped('lamp', 1, [' C ', 'CTC', ' C '], { C: 'cinnabar', T: 'torch' });
  shaped('mossy_cobble', 0, [], {}); R.pop();
  shapeless('mossy_cobble', 1, ['cobble', 'moss_block']);
  shapeless('granite', 1, ['diorite', 'cinnabar']);
  shaped('diorite', 2, ['CL', 'LC'], { C: 'cobble', L: 'calcite' });
  shapeless('andesite', 2, ['diorite', 'cobble']);
  shapeless('coarse_dirt', 4, ['dirt', 'dirt', 'gravel', 'gravel']);
  [['coal_block', 'coal'], ['iron_block', 'iron_ingot'], ['gold_block', 'gold_ingot'], ['diamond_block', 'diamond'], ['emerald_block', 'emerald'], ['lapis_block', 'lapis'], ['copper_block', 'copper_ingot'], ['cinnabar_block', 'cinnabar']].forEach(([b, i]) => {
    shaped(b, 1, ['XXX', 'XXX', 'XXX'], { X: i });
    shapeless(i, 9, [b]);
  });
  shaped('leather', 0, [], {}); R.pop();
  shapeless('bone_meal', 3, ['bone']);
  // dyes
  [['yellow_dye', 'dandelion'], ['red_dye', 'poppy'], ['light_blue_dye', 'blue_orchid'], ['blue_dye', 'cornflower'], ['blue_dye', 'lapis'], ['white_dye', 'bone_meal'], ['brown_dye', 'dark_oak_log'], ['black_dye', 'coal'], ['red_dye', 'cinnabar']].forEach(([d, s]) => shapeless(d, 1, [s]));
  [['orange_dye', 'red_dye', 'yellow_dye'], ['pink_dye', 'red_dye', 'white_dye'], ['lime_dye', 'green_dye', 'white_dye'], ['cyan_dye', 'blue_dye', 'green_dye'], ['purple_dye', 'red_dye', 'blue_dye'], ['magenta_dye', 'purple_dye', 'pink_dye'], ['gray_dye', 'black_dye', 'white_dye'], ['light_gray_dye', 'gray_dye', 'white_dye']].forEach(([d, a, b]) => shapeless(d, 2, [a, b]));
  BH.WOOL_COLORS.forEach(c => { if (c !== 'white') shapeless('wool_' + c, 1, [c + '_dye', '#wool']); });
  shaped('wool_white', 1, ['SS', 'SS'], { S: 'string' });
  // tools & armour
  const TMAT = { wood: '#planks', stone: '#stone_craft', copper: 'copper_ingot', iron: 'iron_ingot', gold: 'gold_ingot', diamond: 'diamond' };
  Object.keys(TMAT).forEach(m => {
    const X = TMAT[m];
    shaped(m + '_pickaxe', 1, ['XXX', ' S ', ' S '], { X, S: 'stick' });
    shaped(m + '_axe', 1, ['XX', 'XS', ' S'], { X, S: 'stick' });
    shaped(m + '_shovel', 1, ['X', 'S', 'S'], { X, S: 'stick' });
    shaped(m + '_hoe', 1, ['XX', ' S', ' S'], { X, S: 'stick' });
    shaped(m + '_sword', 1, ['X', 'X', 'S'], { X, S: 'stick' });
  });
  const AMAT = { leather: 'leather', copper: 'copper_ingot', iron: 'iron_ingot', gold: 'gold_ingot', diamond: 'diamond' };
  Object.keys(AMAT).forEach(m => {
    const X = AMAT[m];
    shaped(m + '_helmet', 1, ['XXX', 'X X'], { X });
    shaped(m + '_chestplate', 1, ['X X', 'XXX', 'XXX'], { X });
    shaped(m + '_leggings', 1, ['XXX', 'X X', 'X X'], { X });
    shaped(m + '_boots', 1, ['X X', 'X X'], { X });
  });

  // dimension progression
  shapeless('duskiron_ingot', 1, ['duskiron_scrap', 'duskiron_scrap', 'duskiron_scrap', 'duskiron_scrap', 'gold_ingot', 'gold_ingot', 'gold_ingot', 'gold_ingot']);
  ['pickaxe', 'axe', 'shovel', 'hoe', 'sword', 'helmet', 'chestplate', 'leggings', 'boots'].forEach(t => shapeless('duskiron_' + t, 1, ['diamond_' + t, 'duskiron_ingot']));
  shapeless('ember_dust', 2, ['ember_rod']);
  shapeless('seeker_eye', 1, ['drift_pearl', 'ember_dust']);
  shapeless('fire_charge', 3, ['gunpowder', 'ember_dust', '#coal']);
  shaped('cinder_bricks', 1, ['SS', 'SS'], { S: 'ember_shard' });
  shaped('sunstone', 1, ['GG', 'GG'], { G: 'glow_dust' });
  shaped('voidstone_bricks', 4, ['VV', 'VV'], { V: 'voidstone' });
  shaped('lumen_tile', 4, ['FF', 'FF'], { F: 'drift_fruit' });
  shaped('hollow_lantern', 4, ['R', 'F'], { R: 'ember_rod', F: 'drift_fruit' });
  shapeless('mossy_stone_bricks', 1, ['stone_bricks', 'moss_block']);
  shaped('chiseled_sandstone', 1, ['S', 'S'], { S: 'cut_sandstone' });
  shaped('drift_cloak', 1, ['PLP', 'LWL', 'PLP'], { P: 'drift_pearl', L: 'leather', W: 'wisp_essence' });
  shaped('name_tag', 1, ['  S', ' P ', 'P  '], { S: 'string', P: 'paper' });
  const GROUPS = {
    planks: k => BLOCKS[ID[k]] && BLOCKS[ID[k]].planks,
    wool: k => k && k.startsWith('wool_'),
    coal: k => k === 'coal' || k === 'charcoal',
    stone_craft: k => k === 'cobble' || k === 'slate' || k === 'mossy_cobble' || k === 'basalt',
    sand: k => k === 'sand' || k === 'red_sand',
  };

  const SMELT = {
    raw_iron: 'iron_ingot', raw_gold: 'gold_ingot', raw_copper: 'copper_ingot', iron_ore: 'iron_ingot', gold_ore: 'gold_ingot', copper_ore: 'copper_ingot',
    sand: 'glass', red_sand: 'glass', cobble: 'stone', stone: 'smooth_stone', clay_ball: 'brick', clay: 'terracotta',
    porkchop: 'cooked_porkchop', beef: 'steak', chicken: 'cooked_chicken', mutton: 'cooked_mutton', potato: 'baked_potato',
    cactus: 'green_dye', sandstone: 'cut_sandstone', ember_ore: 'ember_shard', cinder_gold_ore: 'gold_ingot', ashrock: 'cinder_bricks', duskiron_ore: 'duskiron_scrap', drift_fruit: 'lumen_tile',
  };
  BLOCKS.forEach(b => { if (b.log) SMELT[b.key] = 'charcoal'; });

  BH.BLOCKS = BLOCKS;
  BH.ITEMS = ITEMS;
  BH.ID = ID;
  BH.RECIPES = R;
  BH.GROUPS = GROUPS;
  BH.SMELT = SMELT;
  BH.itemByKey = k => ITEMS[ID[k]];
})();

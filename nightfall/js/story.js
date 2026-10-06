// The story of Ashgrove Manor: files, dialogue and objectives.
var NF = window.NF || (window.NF = {});
NF.story = {
  intro: [
    'October 9th, 1998.<br>Ashgrove County, Oregon.',
    'Six hikers missing in eight days. Livestock found torn open along the Velgen Pharmaceuticals estate line.',
    'Raven Unit was sent in at dusk. Twenty minutes later the helicopter was in the trees, and something with too many teeth was in the dark around the wreck.',
    'Officer Mara Voss lost sight of her partner, Teo Ramirez, in the chaos.<br>She ran for the only light she could see.'
  ],
  files: {
    butler: { title: "Butler's Diary", text: "Sept. 30\nThe Master has brought his work home from the Velgen labs. Dr. Crane and his people arrived with crates marked BIOHAZARD. The Master says they are wine. I have served this family for thirty years and I know what wine smells like.\n\nOct. 3\nTwo of the kitchen staff have a fever. Martha says her skin itches 'underneath'. Dr. Crane took them below to the laboratory for 'observation'. Nobody tells me anything.\n\nOct. 5\nI saw Martha tonight in the east corridor. She did not know my name. She did not know her own.\n\nOct. 6\nSo hungry. The Master's raven key is on the dining room mantel, where it has always been. I keep forgetting why I came in here. I keep looking at the cook's hands.\n\nhungry\n\nhungry" },
    memo: { title: 'Research Memo — Project LAZARUS', text: "VELGEN BIOMEDICAL — RESTRICTED\nFrom: Dr. Elias Crane, Director of Regenerative Research\n\nThe Lazarus agent does not kill the host. It edits the host. Tissue that is useful (muscle, jaw, appetite) is preserved and strengthened. Tissue that is not (memory, conscience, the frontal lobes in general) is quietly recycled for raw material.\n\nSubject 04 lost her skin entirely in the second week. She also lost her eyes, and in compensation developed hearing so sharp that she tracked a dropped pencil across two rooms. She is blind, gentlemen, not deaf. Note this before entering her enclosure.\n\nSubject W-07 ('the Warden') responds to no command but one: RETRIEVE. It will not stop. It cannot be killed by conventional means, only delayed.\n\nI have hidden the emblem for the north corridor in the library. Only senior staff may access the laboratory." },
    guard: { title: "Security Guard's Log", text: "Oct. 6 — 22:10\nThe dogs got out. All of them. Kennel door looks like it was opened from the inside. Hendricks went out to the treeline with a flashlight and we heard him for a long time.\n\nOct. 7 — 03:40\nLab staff are not answering. Locked down the north corridor. Spare lab keycard is in my jacket.\n\nOct. 7 — 05:15\nSomething huge is walking the halls. Wears an iron mask. It went past the guard room door twice, slow, like it was listening. The doctor called it 'the Warden.' I fired four rounds into its back. It turned around.\n\nIt doesn't come into this room. I don't know why. Maybe because nobody in here is worth retrieving.\n\nOct. 8\nItchy." },
    dispatch: { title: 'Dispatch Log — Halverson Falls PD', text: "Oct. 8, 21:40\nAll units, report from Millbrook: residents gathering at the bell tower after dark. Nobody answering doors. Sheriff Doyle went out to check.\n\nOct. 8, 23:55\nSheriff Doyle has not reported in.\n\nOct. 9, 02:10\nMultiple 911 calls in town. Bites. One caller said her husband 'got back up.'\n\nOct. 9, 04:30\nState says the Crow Ridge relay is the only thing that will reach the airfield beacon. The generator up there needs a fuse; spare is in our armory.\n\nOct. 9, 05:05\nIf anyone reads this: the county evac bird will only set down at the airfield helipad, and only if the pilot sees a flare. We gave the last flare gun to the sexton at St. Agnes for safekeeping." },
    pastor: { title: 'The Sexton\'s Notebook', text: "They come to the church because the bell still rings. I think some part of them remembers Sunday.\n\nA police officer stumbled in tonight, bleeding, half out of his mind. Ramirez, his badge said. Kept asking for his partner. I bandaged him. He did not need it for long.\n\nHe is changing faster than the others. His arm... God forgive me, I locked him in the nave with the flare gun still on the altar.\n\nIf you are his partner: he said to tell you he's sorry he lied." },
    hollow: { title: 'Pamphlet — The Hollow Congregation', text: "BROTHERS AND SISTERS OF MILLBROOK\n\nThe men from Velgen came with a gift in the water, and we were made hollow, and in the hollow there is room for the Voice.\n\nDo not fear the itch. Do not fear the hunger. Gather at the bell when it tolls. Carry your tools; there is work to do.\n\nThe Butcher keeps the gate. Strangers are to be welcomed into the Congregation, in pieces if necessary." },
    field: { title: 'Velgen Field Station — Incident Report', text: "Subject class R ('Reapers') were bred from Lazarus-exposed reptile stock for field security. They are fast, they are clever, and they are fond of necks.\n\nThree escaped during the containment failure at the manor. Two more were released deliberately by Dr. Crane's assistant before she was eaten.\n\nAlso note: the Warden (W-07) tracked its last target across eleven miles of forest. If W-07 survived the manor, it is still following someone." },
    ranger: { title: 'Ranger Station Log', text: "Week 1: Deer carcasses with the bones gnawed. Crows won't leave the farms alone. Big ones, and they go for eyes.\n\nWeek 2: Something under the Harlan fields. The ground moves like water. Lost a tractor into it.\n\nWeek 3: Spiders at the old copper mine the size of dogs. I am not going back there.\n\nWeek 4: Resigning. Tell whoever replaces me to keep a truck fueled and the keys in it." },
    quarry: { title: 'Quarry Foreman\'s Note', text: "Shut down blasting after the Velgen trucks dumped their 'waste' in pit four. Two weeks later the pit floor started breathing.\n\nWe left the M72 rocket launcher the army lent us for clearing the rock face in the site office. If that thing in the pit ever comes up, use it. All of it." },
    crane: { title: "Crane's Final Entry", text: "Day 41.\n\nThe board has ordered the program terminated and the subjects incinerated. Forty-one days, and they want me to burn the only thing in this century that ever truly worked.\n\nNo.\n\nI have prepared the full-strength agent. Not the diluted strain we gave the staff. The pure Lazarus line.\n\nIf it edits the weak, then I will give it nothing weak to edit. I will step into the central tank and let it keep what is best of me.\n\nWhoever reads this: the emergency exit opens when containment is resolved. That is, when there is nothing left alive in this laboratory to contain.\n\nI do not intend to make that easy." }
  },
  files2: {},
  items: {
    herb: { name: 'Green Herb', icon: '🌿', desc: 'A medicinal herb native to the region. Restores some health. Combine two for a stronger remedy.' },
    mixed: { name: 'Mixed Herbs (G+G)', icon: '🍃', desc: 'Two green herbs ground together. Restores a lot of health.' },
    spray: { name: 'First Aid Spray', icon: '🧴', desc: 'A medical spray. Fully restores health.' },
    key_raven: { name: 'Raven Key', icon: '🗝️', desc: 'An old brass key with a raven worked into the bow. Opens the library.' },
    crest: { name: 'Crest Emblem', icon: '🛡️', desc: 'A hexagonal silver emblem with a red stone. It looks like it belongs in a door.' },
    keycard: { name: 'Lab Keycard', icon: '💳', desc: 'VELGEN BIOMEDICAL — SECURITY LEVEL 2. Spattered with Teo\'s blood.' },
    handgun: { name: 'M19 Handgun', icon: '🔫', desc: 'Your service pistol. 13-round magazine. Steady your aim for clean headshots.' },
    shotgun: { name: 'M37 Shotgun', icon: '💥', desc: 'A pump-action shotgun. Devastating up close. Knocks the infected off their feet.' },
    magnum: { name: 'Bulldog .50', icon: '⚡', desc: 'A huge revolver from the lab armory. Six rounds of absolute authority.' },
    red_herb: { name: 'Red Herb', icon: '🌺', desc: 'Useless alone. Combined with a green herb it fully restores health.' },
    blue_herb: { name: 'Blue Herb', icon: '💠', desc: 'Neutralises poison and restores a little health.' },
    mixed_gr: { name: 'Mixed Herbs (G+R)', icon: '🌸', desc: 'Fully restores health.' },
    powder: { name: 'Gunpowder', icon: '⚫', desc: 'Combine into ammunition from the inventory.' },
    grenade: { name: 'Hand Grenade', icon: '💣', desc: 'Press G to throw.' },
    fuse: { name: 'Relay Fuse', icon: '🔌', desc: 'A heavy ceramic fuse for the Crow Ridge beacon generator.' },
    flare: { name: 'Flare Gun', icon: '🧨', desc: 'One flare. Fire it at the airfield helipad to call the evac helicopter.' },
    smg: { name: 'MP5-K', icon: '🔫', desc: 'Fully automatic. Hold left mouse. Chews through ammo.' },
    rifle: { name: 'Remington 700', icon: '🎯', desc: 'Bolt-action rifle with a 4x scope. Huge damage at range.' },
    gl: { name: 'M79 Launcher', icon: '🧯', desc: 'Lobs explosive grenades. Mind the blast radius.' },
    rpg: { name: 'M72 Rocket', icon: '🚀', desc: 'Single-shot rocket launcher. For things that should not exist.' },
    knife: { name: 'Combat Knife', icon: '🔪', desc: 'Always with you. Left mouse while not aiming.' }
  },
  objectives: {
    start: 'Find Teo. Search the manor for a way forward.',
    raven: 'The raven key — try the library door in the main hall.',
    crest: 'Place the Crest Emblem in the north door of the main hall.',
    hall: 'Search the north corridor.',
    teo: 'Get the keycard to the laboratory door at the end of the corridor.',
    lab: 'Find a way out through the laboratory.',
    boss: 'Survive.',
    escape: 'ESCAPE through the emergency exit before self-destruct!',
    town: 'Reach the Halverson Falls police station and call for evac.',
    relay: 'Take the relay fuse to the Crow Ridge Relay and restart the beacon.',
    defend: 'Hold the relay until the beacon is live.',
    church: 'Find the flare gun at St. Agnes Church.',
    airfield: 'Get to the Halverson County Airfield helipad and fire the flare.',
    final: 'Survive until the helicopter can land.',
    free: 'Explore Ashgrove County.'
  }
};

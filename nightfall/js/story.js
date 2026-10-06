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
    crane: { title: "Crane's Final Entry", text: "Day 41.\n\nThe board has ordered the program terminated and the subjects incinerated. Forty-one days, and they want me to burn the only thing in this century that ever truly worked.\n\nNo.\n\nI have prepared the full-strength agent. Not the diluted strain we gave the staff. The pure Lazarus line.\n\nIf it edits the weak, then I will give it nothing weak to edit. I will step into the central tank and let it keep what is best of me.\n\nWhoever reads this: the emergency exit opens when containment is resolved. That is, when there is nothing left alive in this laboratory to contain.\n\nI do not intend to make that easy." }
  },
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
    escape: 'ESCAPE through the emergency exit before self-destruct!'
  }
};

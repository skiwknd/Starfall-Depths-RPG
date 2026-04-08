const SAVE_KEY = "starfall-depths-save";

const titleScreen = document.getElementById("title-screen");
const gameScreen = document.getElementById("game-screen");
const settingsScreen = document.getElementById("settings-screen");
const startButton = document.getElementById("start-button");
const loadButton = document.getElementById("load-button");
const saveButton = document.getElementById("save-button");
const restartButton = document.getElementById("restart-button");
const settingsButton = document.getElementById("settings-button");
const backToGameButton = document.getElementById("back-to-game-button");
const volumeSlider = document.getElementById("volume-slider");
const volumeValue = document.getElementById("volume-value");
const playerNameInput = document.getElementById("player-name");
const playerClassInput = document.getElementById("player-class");
const classPreviewText = document.getElementById("class-preview-text");

const statName = document.getElementById("stat-name");
const statClass = document.getElementById("stat-class");
const statHealth = document.getElementById("stat-health");
const statGold = document.getElementById("stat-gold");
const statLocation = document.getElementById("stat-location");

const sceneTitle = document.getElementById("scene-title");
const storyText = document.getElementById("story-text");
const mapShipName = document.getElementById("map-ship-name");
const mapShipAtmosphere = document.getElementById("map-ship-atmosphere");
const roomMap = document.getElementById("room-map");
const diceTray = document.getElementById("dice-tray");
const diceLabel = document.getElementById("dice-label");
const diceDisplay = document.getElementById("dice-display");
const combatLog = document.getElementById("combat-log");
const systemMessage = document.getElementById("system-message");
const choicesContainer = document.getElementById("choices");
const inventoryList = document.getElementById("inventory-list");
const inventoryHint = document.getElementById("inventory-hint");
const equipmentList = document.getElementById("equipment-list");
const equipmentSummary = document.getElementById("equipment-summary");
const bodyHitText = document.getElementById("body-hit-text");
const injurySummary = document.getElementById("injury-summary");
const recentCombatLog = document.getElementById("recent-combat-log");
const bodyPanel = document.querySelector(".body-panel");

const bodyPartElements = {
  head: document.getElementById("body-head"),
  torso: document.getElementById("body-torso"),
  leftArm: document.getElementById("body-left-arm"),
  rightArm: document.getElementById("body-right-arm"),
  leftLeg: document.getElementById("body-left-leg"),
  rightLeg: document.getElementById("body-right-leg")
};

const BODY_PART_KEYS = Object.keys(bodyPartElements);
const BODY_PART_LABELS = {
  head: "head",
  torso: "torso",
  leftArm: "left arm",
  rightArm: "right arm",
  leftLeg: "left leg",
  rightLeg: "right leg"
};
const BODY_STATE_ORDER = ["healthy", "injured", "critical", "disabled"];
const EQUIPMENT_SLOTS = [
  "head",
  "torso",
  "leftArm",
  "rightArm",
  "legs",
  "weaponMainHand",
  "weaponOffHand"
];
const EQUIPMENT_SLOT_LABELS = {
  head: "Head",
  torso: "Torso",
  leftArm: "Left Arm",
  rightArm: "Right Arm",
  legs: "Legs",
  weaponMainHand: "Main Hand",
  weaponOffHand: "Off Hand"
};
const SOUND_FILES = {
  attack: "sounds/attack.wav",
  ability: "sounds/attack.wav",
  damage: "sounds/damage.wav",
  heal: "sounds/heal.wav",
  item: "sounds/item.wav",
  gold: "sounds/gold.wav",
  triumph: "sounds/triumph.wav"
};
const MASTER_VOLUME_KEY = "starfall-depths-master-volume";
const ABILITY_COOLDOWN_MS = 2 * 60 * 1000;

const classes = {
  grunt: {
    name: "Grunt",
    startingHealth: 30,
    description: "High health and steady damage.",
    attackPowerText: "Normal attack: 1d6 + 1. Special ability: Power Strike - 1d10 + 2.",
    abilityName: "Power Strike",
    abilityText: "A crushing hit that deals heavy damage.",
    useAbility() {
      return rollDice(1, 10, 2);
    }
  },
  smuggler: {
    name: "Smuggler",
    startingHealth: 24,
    description: "Balanced health with a tricky dodge attack.",
    attackPowerText: "Normal attack: 1d6 + 1. Special ability: Shadow Step - 1d4 + 1.",
    abilityName: "Shadow Step",
    abilityText: "Evade the enemy attack this turn and strike back.",
    useAbility() {
      return {
        attackRoll: rollDice(1, 4, 1),
        dodge: true
      };
    }
  },
  cyborg: {
    name: "Cyborg",
    startingHealth: 20,
    description: "Lower health, but the strongest tech burst.",
    attackPowerText: "Normal attack: 1d6 + 1. Special ability: Plasma Burst - 2d6.",
    abilityName: "Plasma Burst",
    abilityText: "Release a powerful plasma blast.",
    useAbility() {
      return rollDice(2, 6, 0);
    }
  }
};

const items = {
  "Med Patch": {
    id: "med_patch",
    name: "Med Patch",
    rarity: "common",
    type: "consumable",
    slot: null,
    attackBonus: 0,
    defenseBonus: 0,
    description: "Restore health with a quick patch.",
    usable: true,
    combatOnly: false,
    use() {
      const healRoll = rollDice(1, 8, 0);
      const restoredHealth = Math.min(healRoll.total, gameState.maxHealth - gameState.health);
      gameState.health += restoredHealth;

      return {
        roll: healRoll,
        message: `You use a Med Patch and recover ${restoredHealth} health.`,
        type: "heal"
      };
    }
  },
  "Nano Salve": {
    id: "nano_salve",
    name: "Nano Salve",
    rarity: "uncommon",
    type: "consumable",
    slot: null,
    attackBonus: 0,
    defenseBonus: 0,
    description: "Heals one random injured body part by one step.",
    usable: true,
    combatOnly: false,
    use() {
      const healedPart = healRandomBodyPart();

      if (!healedPart) {
        return {
          roll: null,
          message: "Nano Salve has no effect because no body parts are injured.",
          type: "utility",
          consumeItem: false
        };
      }

      return {
        roll: null,
        message: `Nano Salve heals your ${healedPart.readableName} from ${healedPart.fromState} to ${healedPart.toState}.`,
        type: "heal"
      };
    }
  },
  "Repair Kit": {
    id: "repair_kit",
    name: "Repair Kit",
    rarity: "uncommon",
    type: "consumable",
    slot: null,
    attackBonus: 0,
    defenseBonus: 0,
    description: "Choose one injured body part and heal it by one step.",
    usable: true,
    combatOnly: false,
    use() {
      return {
        roll: null,
        message: "Choose a body part to heal with the Repair Kit.",
        type: "heal",
        targetedBodyHeal: true
      };
    }
  },
  "Shield Cell": {
    id: "shield_cell",
    name: "Shield Cell",
    rarity: "uncommon",
    type: "consumable",
    slot: null,
    attackBonus: 0,
    defenseBonus: 0,
    description: "A burst of energy reduces the next enemy strike.",
    usable: true,
    combatOnly: true,
    use() {
      gameState.shieldBlock = 3;

      return {
        roll: null,
        message: "You trigger a Shield Cell. Your next enemy hit will be reduced by 3 damage.",
        type: "utility"
      };
    }
  },
  "Rusty Knife": {
    id: "rusty_knife",
    name: "Rusty Knife",
    rarity: "common",
    type: "weapon",
    slot: "weaponMainHand",
    slotOptions: ["weaponMainHand", "weaponOffHand"],
    attackBonus: 1,
    defenseBonus: 0,
    description: "A worn blade that still adds a little bite to your attacks.",
    usable: false,
    combatOnly: false
  },
  "Shock Baton": {
    id: "shock_baton",
    name: "Shock Baton",
    rarity: "uncommon",
    type: "weapon",
    slot: "weaponMainHand",
    slotOptions: ["weaponMainHand"],
    attackBonus: 2,
    defenseBonus: 0,
    description: "A crackling baton that boosts attack power more than a basic knife.",
    usable: false,
    combatOnly: false
  },
  "Plasma Cutter": {
    id: "plasma_cutter",
    name: "Plasma Cutter",
    rarity: "rare",
    type: "weapon",
    slot: "weaponMainHand",
    slotOptions: ["weaponMainHand"],
    attackBonus: 3,
    defenseBonus: 0,
    description: "Industrial cutting tech turned into a powerful weapon.",
    usable: false,
    combatOnly: false
  },
  "Tim Taser": {
    id: "willy_wacker",
    name: "Tim Taser",
    rarity: "rare",
    type: "weapon",
    slot: "weaponMainHand",
    slotOptions: ["weaponMainHand", "weaponOffHand"],
    attackBonus: 4,
    defenseBonus: 0,
    description: "A surprisingly powerful shock weapon hidden somewhere in the drifting fleet.",
    usable: false,
    combatOnly: false
  },
  "Padded Hood": {
    id: "padded_hood",
    name: "Padded Hood",
    rarity: "common",
    type: "armor",
    slot: "head",
    attackBonus: 0,
    defenseBonus: 1,
    description: "Light head protection that softens blows to the head.",
    usable: false,
    combatOnly: false
  },
  "Reinforced Vest": {
    id: "reinforced_vest",
    name: "Reinforced Vest",
    rarity: "rare",
    type: "armor",
    slot: "torso",
    attackBonus: 0,
    defenseBonus: 2,
    description: "A heavy vest that reduces damage when your torso is hit.",
    usable: false,
    combatOnly: false
  },
  "Arm Guard": {
    id: "arm_guard",
    name: "Arm Guard",
    rarity: "uncommon",
    type: "armor",
    slot: "leftArm",
    slotOptions: ["leftArm", "rightArm"],
    attackBonus: 0,
    defenseBonus: 1,
    description: "Simple forearm plating that protects one arm.",
    usable: false,
    combatOnly: false
  },
  "Leg Plating": {
    id: "leg_plating",
    name: "Leg Plating",
    rarity: "uncommon",
    type: "armor",
    slot: "legs",
    attackBonus: 0,
    defenseBonus: 1,
    description: "Basic lower-body armor that helps when either leg is hit.",
    usable: false,
    combatOnly: false
  },
  "The Singularity Core": {
    id: "singularity_core",
    name: "The Singularity Core",
    rarity: "rare",
    type: "treasure",
    slot: null,
    attackBonus: 0,
    defenseBonus: 0,
    description: "The legendary treasure from the station vault.",
    usable: false,
    combatOnly: false,
    use() {
      return {
        roll: null,
        message: "This treasure is far too valuable to use like a normal item.",
        type: "utility"
      };
    }
  }
};

const enemies = {
  rogueDrone: {
    name: "Rogue Drone",
    health: 12,
    attackDice: { count: 1, sides: 4, bonus: 1 },
    loot: ["Rusty Knife"],
    targetWeights: {
      leftArm: 3,
      rightArm: 3,
      leftLeg: 3,
      rightLeg: 3,
      torso: 1,
      head: 1
    },
    targetStyleText: "It prefers to slash at arms and legs.",
    rewardGold: 8,
    intro: "The drone whirs forward, sparks flying from its damaged chassis."
  },
  alienScavenger: {
    name: "Alien Scavenger",
    health: 18,
    attackDice: { count: 1, sides: 6, bonus: 1 },
    loot: ["Plasma Cutter"],
    targetWeights: {
      head: 4,
      torso: 2,
      leftArm: 1,
      rightArm: 1,
      leftLeg: 1,
      rightLeg: 1
    },
    targetStyleText: "It snaps high, trying to strike the head first.",
    rewardGold: 12,
    intro: "The alien hisses and circles you, ready to defend the vault."
  }
};

const GAME_SCREENS = {
  TITLE: "title",
  EXPLORATION: "exploration",
  COMBAT: "combat",
  SETTINGS: "settings",
  VICTORY: "victory",
  DEFEAT: "defeat"
};

const ENDING_SCREENS = {
  [GAME_SCREENS.VICTORY]: {
    title: "You Win",
    text: (state) =>
      `${state.playerName} escapes Starfall Depths with The Singularity Core. The job is done, the treasure is yours, and your ship vanishes into the stars.`,
    choices: [
      { text: "Play again", action: restartGame }
    ]
  },
  [GAME_SCREENS.DEFEAT]: {
    title: "Mission Failed",
    text: (state) =>
      `${state.playerName} falls aboard ${ships[state.currentShip].name}. The lights fade, the corridors fall silent, and ${ships[state.currentShip].name} drifts on through the stars.`,
    choices: [
      { text: "Try again", action: restartGame }
    ]
  }
};

const ROOM_ACTIONS = {
  starterCache: {
    label: "Search your shuttle supplies",
    onceFlag: "starterCacheFound"
  },
  healingInjector: {
    label: "Use the healing injector"
  },
  medBayDrawer: {
    label: "Open the supply drawer",
    onceFlag: "medBayDrawerOpened"
  },
  cargoCredits: {
    label: "Collect the scattered treasure",
    onceFlag: "cargoCreditsTaken"
  },
  claimBingus: {
    label: "Take The Singularity Core",
    onceFlag: "crystalBingusClaimed"
  },
  solarMedLocker: {
    label: "Open the sterile supply cache",
    onceFlag: "solarMedLockerOpened"
  },
  marketStash: {
    label: "Search the smuggler stash",
    onceFlag: "marketStashOpened"
  },
  beaconGold: {
    label: "Collect the navigation bounty",
    onceFlag: "beaconGoldTaken"
  },
  willyWackerCache: {
    label: "Search the strange hidden cache",
    onceFlag: "willyWackerFound"
  }
};

const ships = {
  starfallDepths: {
    name: "Starfall Depths",
    atmosphere: "A broken research station filled with cold blue lights, drifting cargo, and scavenger danger.",
    startRoom: "arrivalBay",
    rooms: {
      arrivalBay: {
        name: "Arrival Bay",
        text: (state) =>
          `${state.playerName}, your shuttle locks onto the drifting station Starfall Depths. Cold starlight pours through cracked glass, and warning beacons pulse across the hangar. ${
            hasProgressFlag("starterCacheFound")
              ? "Your shuttle locker hangs open, emptied of its useful supplies."
              : "Your shuttle locker may still hold a few emergency supplies."
          }`,
        actions: ["starterCache"],
        connections: [
          { to: "mainCorridor", label: "Enter the main corridor" },
          { toShip: "sunpiercer", toRoom: "sunDock", label: "Take your shuttle to the Sunpiercer" }
        ]
      },
      mainCorridor: {
        name: "Main Corridor",
        text: () =>
          hasProgressFlag("rogueDroneCleared")
            ? "The wrecked rogue drone lies in sparking pieces across the corridor. Blue emergency lights lead deeper into the ship."
            : "You move through a steel corridor lit by blue emergency strips. A rogue drone could be waiting to lunge from the shadows at any moment.",
        encounter: {
          enemy: "rogueDrone",
          clearFlag: "rogueDroneCleared"
        },
        connections: [
          { to: "arrivalBay", label: "Return to the arrival bay" },
          { to: "medBay", label: "Move toward the med bay" },
          { toShip: "driftMarket", toRoom: "marketDock", label: "Follow the beacon route to the Drift Market" }
        ]
      },
      medBay: {
        name: "Med Bay",
        text: () =>
          `Rows of cracked pods line the med bay. One wall injector still hums, and ${
            hasProgressFlag("medBayDrawerOpened")
              ? "the supply drawer now hangs open and empty."
              : "a supply drawer glows with backup power."
          }`,
        actions: ["healingInjector", "medBayDrawer"],
        connections: [
          { to: "mainCorridor", label: "Head back to the main corridor" },
          { to: "cargoHold", label: "Continue toward the cargo hold" }
        ]
      },
      cargoHold: {
        name: "Cargo Hold",
        text: () =>
          `Crates drift in weak gravity. ${
            hasProgressFlag("cargoCreditsTaken")
              ? "Only scraps remain where the loose credits once floated."
              : "Broken locks spill old credit chips across the floor."
          } The vault corridor yawns open beyond the hold.`,
        actions: ["cargoCredits"],
        connections: [
          { to: "medBay", label: "Return to the med bay" },
          { to: "vaultDoor", label: "Head for the vault door" }
        ]
      },
      vaultDoor: {
        name: "Vault Door",
        text: () =>
          hasProgressFlag("alienScavengerCleared")
            ? "The scavenger has fallen. The vault door hangs open just enough to reveal a blue glow within."
            : "The vault door hangs open just enough to show a blue glow within. A hostile scavenger could drop from the shadows at any moment.",
        encounter: {
          enemy: "alienScavenger",
          clearFlag: "alienScavengerCleared"
        },
        connections: [
          { to: "cargoHold", label: "Fall back to the cargo hold" },
          { to: "vaultChamber", label: "Enter the vault chamber", requiresFlag: "alienScavengerCleared" }
        ]
      },
      vaultChamber: {
        name: "Vault Chamber",
        text: (state) =>
          getVaultChamberText(state),
        actions: ["claimBingus"],
        connections: [
          { to: "vaultDoor", label: "Step back toward the vault door" }
        ]
      }
    }
  }
  ,
  sunpiercer: {
    name: "Sunpiercer",
    atmosphere: "A bright solar freighter with polished halls, hot engine glow, and medical stations still humming.",
    startRoom: "sunDock",
    rooms: {
      sunDock: {
        name: "Sun Dock",
        text: () =>
          "Your shuttle seals against a gold-lit maintenance dock. Clean white panels flicker here, and the ship still feels almost alive.",
        connections: [
          { to: "solarAtrium", label: "Walk into the solar atrium" },
          { toShip: "starfallDepths", toRoom: "arrivalBay", label: "Fly back to Starfall Depths" }
        ]
      },
      solarAtrium: {
        name: "Solar Atrium",
        text: () =>
          "Transparent ceiling ribs spill warm light across planter beds and shattered display screens. A distant alarm chirps between bursts of static.",
        connections: [
          { to: "sunDock", label: "Return to the dock" },
          { to: "medSpire", label: "Head toward the med spire" },
          { to: "engineWalk", label: "Cross the engine walk" }
        ]
      },
      medSpire: {
        name: "Med Spire",
        text: () =>
          `Tall cabinets line the circular infirmary. ${
            hasProgressFlag("solarMedLockerOpened")
              ? "The supply cache is open and stripped clean."
              : "One sterile cache still glows green behind cracked glass."
          }`,
        actions: ["healingInjector", "solarMedLocker"],
        connections: [
          { to: "solarAtrium", label: "Return to the atrium" },
          { to: "engineWalk", label: "Move toward the engine walk" }
        ]
      },
      engineWalk: {
        name: "Engine Walk",
        text: () =>
          hasProgressFlag("sunDroneCleared")
            ? "The shattered drone lies quiet beside the roaring solar vents. The way to the bridge is open."
            : "A narrow catwalk stretches over blazing reactor shafts. A scorched defense drone jerks to life near the bridge lift.",
        encounter: {
          enemy: "rogueDrone",
          clearFlag: "sunDroneCleared"
        },
        connections: [
          { to: "solarAtrium", label: "Retreat to the atrium" },
          { to: "medSpire", label: "Step back to the med spire" },
          { to: "sunBridge", label: "Climb to the bridge", requiresFlag: "sunDroneCleared" }
        ]
      },
      sunBridge: {
        name: "Sun Bridge",
        text: () =>
          "The bridge windows blaze with reflected starlight. Long-range routes flicker on the pilot table, pointing toward a drifting trade vessel.",
        connections: [
          { to: "engineWalk", label: "Go back down the engine walk" },
          { toShip: "driftMarket", toRoom: "marketDock", label: "Chart a flight to the Drift Market" }
        ]
      }
    }
  },
  driftMarket: {
    name: "Drift Market",
    atmosphere: "A patched-together trade ship full of neon signs, hidden caches, and narrow walkways that feel one ambush away from disaster.",
    startRoom: "marketDock",
    rooms: {
      marketDock: {
        name: "Market Dock",
        text: () =>
          "Chains rattle overhead as your shuttle latches onto a crooked trade dock. Neon adverts flicker across metal walls patched a dozen times over.",
        connections: [
          { to: "bazaarSpine", label: "Enter the bazaar spine" },
          { toShip: "starfallDepths", toRoom: "mainCorridor", label: "Return to Starfall Depths" },
          { toShip: "sunpiercer", toRoom: "sunBridge", label: "Fly to the Sunpiercer bridge" }
        ]
      },
      bazaarSpine: {
        name: "Bazaar Spine",
        text: () =>
          "Empty merchant stalls line a long corridor of hanging lights. Most of the market is silent now, but someone or something still watches from above.",
        connections: [
          { to: "marketDock", label: "Return to the dock" },
          { to: "smugglerNook", label: "Slip into the smuggler nook" },
          { to: "signalLoft", label: "Climb to the signal loft" }
        ]
      },
      smugglerNook: {
        name: "Smuggler Nook",
        text: () =>
          `A hidden booth sits behind stacked cargo mesh. ${
            hasProgressFlag("marketStashOpened")
              ? "The stash compartments are open and empty."
              : "A sealed stash case hums softly under the counter."
          }`,
        actions: ["marketStash"],
        connections: [
          { to: "bazaarSpine", label: "Head back to the bazaar spine" },
          { to: "signalLoft", label: "Move up to the signal loft" }
        ]
      },
      signalLoft: {
        name: "Signal Loft",
        text: () =>
          hasProgressFlag("marketScavengerCleared")
            ? `The loft is quiet now, and the navigation beacon still pulses. ${
              hasProgressFlag("beaconGoldTaken")
                ? "Its reward locker stands open."
                : "A reward locker sits beneath the beacon."
            }`
            : "A nest of cables sways over the loft. An alien scavenger guards the live beacon and hisses from the rafters.",
        encounter: {
          enemy: "alienScavenger",
          clearFlag: "marketScavengerCleared"
        },
        actions: ["beaconGold"],
        connections: [
          { to: "bazaarSpine", label: "Drop back to the bazaar spine" },
          { to: "smugglerNook", label: "Return to the smuggler nook" },
          { toShip: "starfallDepths", toRoom: "vaultDoor", label: "Use the beacon route to return to Starfall Depths" }
        ]
      }
    }
  }
};

const gameState = createDefaultState();
const soundEffects = createSoundEffects();
let bodyHighlightTimer = null;
let damageFlashTimer = null;
let masterVolume = loadMasterVolume();
let abilityReadyPulseTimer = null;
let abilityCooldownSyncTimer = null;

startButton.addEventListener("click", beginGame);
loadButton.addEventListener("click", loadGame);
saveButton.addEventListener("click", saveGame);
restartButton.addEventListener("click", restartGame);
settingsButton.addEventListener("click", openSettingsScreen);
backToGameButton.addEventListener("click", closeSettingsScreen);
volumeSlider.addEventListener("input", updateMasterVolume);

document.addEventListener("click", (event) => {
  const button = event.target.closest("button");

  if (!button || button.disabled) {
    return;
  }

  button.classList.remove("button-press");
  void button.offsetWidth;
  button.classList.add("button-press");

  window.setTimeout(() => {
    button.classList.remove("button-press");
  }, 180);
});

playerNameInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    beginGame();
  }
});
playerClassInput.addEventListener("change", updateClassPreview);

updateLoadButton();
renderInventory();
updateClassPreview();
syncVolumeControls();
window.setInterval(updateAbilityCooldownUI, 250);

function createDefaultState() {
  return {
    screen: GAME_SCREENS.TITLE,
    previousScreen: GAME_SCREENS.EXPLORATION,
    playerName: "",
    playerClass: "grunt",
    health: 30,
    maxHealth: 30,
    gold: 10,
    inventory: [],
    equipped: createDefaultEquipment(),
    currentShip: "starfallDepths",
    currentRoom: ships.starfallDepths.startRoom,
    willyWackerLocation: pickRandomWillyWackerLocation(),
    visitedRooms: {},
    progressFlags: {},
    inCombat: false,
    combat: null,
    abilityCooldowns: createDefaultAbilityCooldowns(),
    shieldBlock: 0,
    lastBodyHitText: "No major injuries yet.",
    bodyParts: createDefaultBodyParts(),
    recentCombatEvents: [],
    recentHitPart: ""
  };
}

function createDefaultEquipment() {
  return EQUIPMENT_SLOTS.reduce((equipment, slotKey) => {
    equipment[slotKey] = null;
    return equipment;
  }, {});
}

function createDefaultAbilityCooldowns() {
  return Object.keys(classes).reduce((cooldowns, classKey) => {
    cooldowns[classKey] = 0;
    return cooldowns;
  }, {});
}

function createSoundEffects() {
  return Object.entries(SOUND_FILES).reduce((effects, [key, filePath]) => {
    const audio = new Audio(filePath);
    audio.preload = "auto";
    effects[key] = audio;
    return effects;
  }, {});
}

function loadMasterVolume() {
  const storedValue = Number(localStorage.getItem(MASTER_VOLUME_KEY));

  if (Number.isFinite(storedValue)) {
    return Math.min(1, Math.max(0, storedValue));
  }

  return 0.7;
}

function syncVolumeControls() {
  const volumePercent = Math.round(masterVolume * 100);
  volumeSlider.value = volumePercent;
  volumeValue.textContent = `${volumePercent}%`;
}

function openSettingsScreen() {
  gameState.previousScreen = gameState.screen;
  gameState.screen = GAME_SCREENS.SETTINGS;
  gameScreen.classList.add("hidden");
  settingsScreen.classList.remove("hidden");
}

function closeSettingsScreen() {
  gameState.screen = gameState.previousScreen || GAME_SCREENS.EXPLORATION;
  settingsScreen.classList.add("hidden");
  gameScreen.classList.remove("hidden");
  renderCurrentView();
}

function updateMasterVolume() {
  masterVolume = Number(volumeSlider.value) / 100;
  volumeValue.textContent = `${volumeSlider.value}%`;
  localStorage.setItem(MASTER_VOLUME_KEY, String(masterVolume));
}

function createDefaultBodyParts() {
  return BODY_PART_KEYS.reduce((bodyParts, partKey) => {
    bodyParts[partKey] = "healthy";
    return bodyParts;
  }, {});
}

function beginGame() {
  const enteredName = playerNameInput.value.trim();
  const selectedClassKey = playerClassInput.value;
  const selectedClass = classes[selectedClassKey];

  Object.assign(gameState, createDefaultState(), {
    playerName: enteredName || "Captain PepperJack",
    playerClass: selectedClassKey,
    health: selectedClass.startingHealth,
    maxHealth: selectedClass.startingHealth
  });

  gameState.screen = GAME_SCREENS.EXPLORATION;
  syncVisibleScreens();
  showSystemMessage(`New mission started. ${selectedClass.name} ready for launch.`, "neutral");
  playSound("start");
  renderCurrentView();
}

function updateClassPreview() {
  const selectedClass = classes[playerClassInput.value];
  classPreviewText.textContent =
    `${selectedClass.name}: ${selectedClass.description} Starting health: ${selectedClass.startingHealth}. ${selectedClass.attackPowerText}`;
}

function syncVisibleScreens() {
  titleScreen.classList.toggle("hidden", gameState.screen !== GAME_SCREENS.TITLE);
  settingsScreen.classList.toggle("hidden", gameState.screen !== GAME_SCREENS.SETTINGS);
  gameScreen.classList.toggle(
    "hidden",
    ![
      GAME_SCREENS.EXPLORATION,
      GAME_SCREENS.COMBAT,
      GAME_SCREENS.VICTORY,
      GAME_SCREENS.DEFEAT
    ].includes(gameState.screen)
  );
}

function renderCurrentView() {
  syncVisibleScreens();

  if (gameState.screen === GAME_SCREENS.EXPLORATION) {
    renderExplorationView();
    return;
  }

  if (gameState.screen === GAME_SCREENS.COMBAT) {
    renderCurrentCombatView();
    return;
  }

  if (gameState.screen === GAME_SCREENS.VICTORY || gameState.screen === GAME_SCREENS.DEFEAT) {
    renderEndingView(gameState.screen);
  }
}

function renderExplorationView() {
  const room = getCurrentRoom();
  markCurrentRoomVisited();

  sceneTitle.textContent = room.name;
  storyText.textContent = room.text(gameState);
  hideDiceTray();
  combatLog.classList.add("hidden");
  combatLog.textContent = "";
  updateStats();
  renderRoomMap();
  renderChoices(buildExplorationChoices(room));
  renderInventory();
}

function renderEndingView(screenKey) {
  const ending = ENDING_SCREENS[screenKey];

  sceneTitle.textContent = ending.title;
  storyText.textContent = ending.text(gameState);
  hideDiceTray();
  combatLog.classList.add("hidden");
  combatLog.textContent = "";
  updateStats();
  renderRoomMap();
  renderChoices(ending.choices);
  renderInventory();
}

function buildExplorationChoices(room) {
  const roomActions = [...(room.actions || [])];

  if (shouldShowWillyWackerCache()) {
    roomActions.push("willyWackerCache");
  }

  const actionChoices = roomActions
    .filter((actionKey) => canUseRoomAction(actionKey))
    .map((actionKey) => ({
      text: getRoomActionLabel(actionKey),
      action: () => runRoomAction(actionKey)
    }));

  const connectionChoices = (room.connections || [])
    .filter((connection) => !connection.requiresFlag || hasProgressFlag(connection.requiresFlag))
    .map((connection) => ({
      text: connection.label,
      action: () => travelThroughConnection(connection)
    }));

  return [...actionChoices, ...connectionChoices];
}

function renderChoices(choices) {
  choicesContainer.innerHTML = "";

  choices.forEach((choice) => {
    const button = document.createElement("button");
    button.className = `choice-button${choice.className ? ` ${choice.className}` : ""}`;
    button.textContent = choice.text;
    button.disabled = Boolean(choice.disabled);

    if (choice.html) {
      button.innerHTML = choice.html;
    }

    if (choice.dataset) {
      Object.entries(choice.dataset).forEach(([key, value]) => {
        button.dataset[key] = value;
      });
    }

    button.addEventListener("click", choice.action);
    choicesContainer.appendChild(button);
  });
}

function updateStats() {
  statName.textContent = gameState.playerName || "-";
  statClass.textContent = classes[gameState.playerClass].name;
  statHealth.textContent = `${gameState.health} / ${gameState.maxHealth}`;
  statGold.textContent = gameState.gold;
  statLocation.textContent = getCurrentLocationLabel();
  renderEquipment();
  renderBodyStatus();
}

function renderRoomMap() {
  const ship = getCurrentShip();

  mapShipName.textContent = ship.name;
  mapShipAtmosphere.textContent = ship.atmosphere;
  roomMap.innerHTML = "";

  Object.entries(ship.rooms).forEach(([roomKey, room]) => {
    const visited = hasVisitedRoom(ship.id || gameState.currentShip, roomKey);

    if (!visited) {
      return;
    }

    const roomCard = document.createElement("div");
    roomCard.className = "map-room";
    roomCard.dataset.visited = String(visited);
    roomCard.classList.toggle("current-room", roomKey === gameState.currentRoom);

    const roomName = document.createElement("div");
    roomName.className = "map-room-name";
    roomName.textContent = room.name;

    const roomTag = document.createElement("div");
    roomTag.className = "map-room-tag";
    roomTag.textContent = roomKey === gameState.currentRoom
      ? "Current Room"
      : "Visited";

    roomCard.appendChild(roomName);
    roomCard.appendChild(roomTag);
    roomMap.appendChild(roomCard);
  });
}

function renderBodyStatus() {
  BODY_PART_KEYS.forEach((partKey) => {
    const state = gameState.bodyParts[partKey];
    const label = `${getReadableBodyPartName(partKey)}: ${state}`;
    bodyPartElements[partKey].dataset.state = state;
    bodyPartElements[partKey].title = label;
    bodyPartElements[partKey].setAttribute("aria-label", label);
    bodyPartElements[partKey].classList.toggle("recent-hit", gameState.recentHitPart === partKey);
  });

  bodyHitText.textContent = gameState.lastBodyHitText;
  injurySummary.innerHTML = "";
  recentCombatLog.innerHTML = "";

  buildInjurySummaryLines().forEach((line) => {
    const item = document.createElement("div");
    item.className = "injury-line";
    item.textContent = line;
    injurySummary.appendChild(item);
  });

  gameState.recentCombatEvents.forEach((eventText) => {
    const item = document.createElement("div");
    item.className = "combat-event";
    item.textContent = eventText;
    recentCombatLog.appendChild(item);
  });
}

function buildInjurySummaryLines() {
  const penalties = getCurrentPenalties();
  const lines = [];

  if (penalties.attackPenalty > 0) {
    lines.push(`Attack down: arm injuries reduce attack power by ${penalties.attackPenalty}.`);
  }

  if (penalties.headAccuracyPenalty > 0) {
    lines.push("Accuracy down: head injuries make attacks miss more often.");
  }

  if (penalties.torsoDamageBonus > 0) {
    lines.push(`Defense down: torso injuries add ${penalties.torsoDamageBonus} extra damage when you are hit.`);
  }

  if (penalties.fleePenalty > 0 && !penalties.cannotFlee) {
    lines.push("Mobility down: leg injuries make fleeing and dodging harder.");
  }

  if (penalties.cannotFlee) {
    lines.push("Disabled leg: you cannot flee from combat.");
  }

  if (penalties.dodgePenalty > 0) {
    lines.push("Leg damage: dodging special moves is less reliable.");
  }

  return lines.length ? lines : ["No injury penalties are active."];
}

function getCurrentPenalties() {
  const attackPenalty =
    getBodySeverityValue("leftArm") +
    getBodySeverityValue("rightArm");
  const headAccuracyPenalty = getBodySeverityValue("head");
  const torsoDamageBonus = getBodySeverityValue("torso");
  const fleePenalty =
    getBodySeverityValue("leftLeg") +
    getBodySeverityValue("rightLeg");
  const dodgePenalty = fleePenalty;
  const cannotFlee =
    gameState.bodyParts.leftLeg === "disabled" ||
    gameState.bodyParts.rightLeg === "disabled";

  return {
    attackPenalty,
    headAccuracyPenalty,
    torsoDamageBonus,
    fleePenalty,
    dodgePenalty,
    cannotFlee
  };
}

function getBodySeverityValue(partKey) {
  const state = gameState.bodyParts[partKey];

  if (state === "injured") {
    return 1;
  }

  if (state === "critical") {
    return 2;
  }

  if (state === "disabled") {
    return 3;
  }

  return 0;
}

function applyBodyDamage(hitPart = chooseEnemyTargetBodyPart()) {
  const currentState = gameState.bodyParts[hitPart];
  const nextState = shiftBodyState(currentState, 1);
  gameState.bodyParts[hitPart] = nextState;

  const readableName = getReadableBodyPartName(hitPart);
  gameState.lastBodyHitText = `Latest hit: your ${readableName} was hit and is now ${nextState}.`;
  gameState.recentHitPart = hitPart;
  triggerDamageFlash();
  triggerBodyPartHighlight(hitPart);

  return {
    hitPart,
    readableName,
    state: nextState
  };
}

function chooseEnemyTargetBodyPart() {
  const enemyData = enemies[gameState.combat.key];
  const weightedTargets = [];

  BODY_PART_KEYS.forEach((partKey) => {
    const weight = enemyData?.targetWeights?.[partKey] || 1;

    for (let index = 0; index < weight; index += 1) {
      weightedTargets.push(partKey);
    }
  });

  return weightedTargets[randomNumber(0, weightedTargets.length - 1)];
}

function triggerBodyPartHighlight(partKey) {
  gameState.recentHitPart = partKey;
  renderBodyStatus();

  if (bodyHighlightTimer) {
    window.clearTimeout(bodyHighlightTimer);
  }

  bodyHighlightTimer = window.setTimeout(() => {
    gameState.recentHitPart = "";
    renderBodyStatus();
  }, 900);
}

function triggerDamageFlash() {
  if (!bodyPanel) {
    return;
  }

  bodyPanel.classList.remove("damage-flash");
  void bodyPanel.offsetWidth;
  bodyPanel.classList.add("damage-flash");

  if (damageFlashTimer) {
    window.clearTimeout(damageFlashTimer);
  }

  damageFlashTimer = window.setTimeout(() => {
    bodyPanel.classList.remove("damage-flash");
  }, 320);
}

function getReadableBodyPartName(partKey) {
  return BODY_PART_LABELS[partKey];
}

function shiftBodyState(currentState, direction) {
  const currentIndex = BODY_STATE_ORDER.indexOf(currentState);
  const nextIndex = Math.min(
    Math.max(currentIndex + direction, 0),
    BODY_STATE_ORDER.length - 1
  );
  return BODY_STATE_ORDER[nextIndex];
}

function getInjuredBodyParts() {
  return BODY_PART_KEYS.filter((partKey) => gameState.bodyParts[partKey] !== "healthy");
}

function healBodyPart(partKey) {
  const currentState = gameState.bodyParts[partKey];
  if (currentState === "healthy") {
    return null;
  }

  const nextState = shiftBodyState(currentState, -1);
  gameState.bodyParts[partKey] = nextState;
  gameState.lastBodyHitText = `Recovery: your ${getReadableBodyPartName(partKey)} improves from ${currentState} to ${nextState}.`;
  triggerBodyPartHighlight(partKey);

  return {
    partKey,
    readableName: getReadableBodyPartName(partKey),
    fromState: currentState,
    toState: nextState
  };
}

function healRandomBodyPart() {
  const injuredParts = getInjuredBodyParts();
  if (injuredParts.length === 0) {
    return null;
  }

  const chosenPart = injuredParts[randomNumber(0, injuredParts.length - 1)];
  return healBodyPart(chosenPart);
}

function renderInventory() {
  inventoryList.innerHTML = "";
  renderEquipment();

  if (gameState.inventory.length === 0) {
    inventoryHint.textContent = "Carried inventory is empty.";
    return;
  }

  inventoryHint.textContent = gameState.inCombat
    ? "Consumables can be used during combat. Equipment can be changed between fights."
    : "Carry supplies and gear here. Equip weapons and armor any time outside combat.";

  const counts = countInventory();
  Object.keys(counts).forEach((itemName) => {
    const itemData = items[itemName];
    const row = document.createElement("div");
    row.className = "inventory-item";

    const info = document.createElement("div");
    info.className = "inventory-copy";
    info.innerHTML = `<strong class="item-rarity item-rarity-${itemData.rarity || "common"}">${itemName}</strong><span>x${counts[itemName]} • ${itemData.description}</span>`;

    const actions = document.createElement("div");
    actions.className = "inventory-actions";

    if (itemData.usable) {
      const useButton = document.createElement("button");
      useButton.className = "inventory-button";
      useButton.textContent = "Use";
      useButton.disabled = Boolean(itemData.combatOnly && !gameState.inCombat);
      useButton.addEventListener("click", () => useInventoryItem(itemName));
      actions.appendChild(useButton);
    }

    if (isEquippableItem(itemName)) {
      const comparison = document.createElement("span");
      comparison.className = "inventory-compare";
      comparison.textContent = getEquipmentComparisonText(itemName);
      info.appendChild(comparison);

      getItemSlotOptions(itemName).forEach((slotKey) => {
        const equipButton = document.createElement("button");
        equipButton.className = "inventory-button";
        equipButton.textContent = `Equip ${EQUIPMENT_SLOT_LABELS[slotKey]}`;
        equipButton.disabled = gameState.inCombat;
        equipButton.addEventListener("click", () => equipItem(itemName, slotKey));
        actions.appendChild(equipButton);
      });
    }

    if (actions.children.length === 0) {
      const storedButton = document.createElement("button");
      storedButton.className = "inventory-button";
      storedButton.textContent = "Stored";
      storedButton.disabled = true;
      actions.appendChild(storedButton);
    }

    row.appendChild(info);
    row.appendChild(actions);
    inventoryList.appendChild(row);
  });
}

function renderEquipment() {
  equipmentSummary.innerHTML = "";
  equipmentList.innerHTML = "";

  buildEquipmentSummaryLines().forEach((line) => {
    const item = document.createElement("div");
    item.className = "equipment-line";
    item.textContent = line;
    equipmentSummary.appendChild(item);
  });

  EQUIPMENT_SLOTS.forEach((slotKey) => {
    const row = document.createElement("div");
    row.className = "inventory-item";

    const info = document.createElement("div");
    info.className = "inventory-copy";
    const itemName = gameState.equipped[slotKey];

    if (!itemName) {
      info.innerHTML = `<strong>${EQUIPMENT_SLOT_LABELS[slotKey]}</strong><span>Empty slot.</span>`;
    } else {
      const itemData = items[itemName];
      info.innerHTML = `<strong>${EQUIPMENT_SLOT_LABELS[slotKey]}: <span class="item-rarity item-rarity-${itemData.rarity || "common"}">${itemName}</span></strong><span>${itemData.description}</span>`;
    }

    const actions = document.createElement("div");
    actions.className = "equipment-actions";

    if (itemName) {
      const unequipButton = document.createElement("button");
      unequipButton.className = "inventory-button";
      unequipButton.textContent = "Unequip";
      unequipButton.disabled = gameState.inCombat;
      unequipButton.addEventListener("click", () => unequipItem(slotKey));
      actions.appendChild(unequipButton);
    }

    row.appendChild(info);
    row.appendChild(actions);
    equipmentList.appendChild(row);
  });
}

function countInventory() {
  const counts = {};

  gameState.inventory.forEach((itemName) => {
    counts[itemName] = (counts[itemName] || 0) + 1;
  });

  return counts;
}

function isEquippableItem(itemName) {
  const itemData = items[itemName];
  return Boolean(itemData && (itemData.type === "weapon" || itemData.type === "armor"));
}

function getItemSlotOptions(itemName) {
  const itemData = items[itemName];
  return itemData.slotOptions || (itemData.slot ? [itemData.slot] : []);
}

function getSlotPrimaryStatText(itemName, slotKey) {
  const itemData = items[itemName];
  if (!itemData) {
    return "no bonus";
  }

  if (itemData.type === "weapon") {
    return `Attack +${itemData.attackBonus}`;
  }

  return `Defense +${itemData.defenseBonus}`;
}

function getBestComparisonSlot(itemName) {
  const slotOptions = getItemSlotOptions(itemName);
  if (slotOptions.length === 0) {
    return null;
  }

  const occupiedSlot = slotOptions.find((slotKey) => gameState.equipped[slotKey]);
  return occupiedSlot || slotOptions[0];
}

function getEquipmentComparisonText(itemName) {
  if (!isEquippableItem(itemName)) {
    return "";
  }

  const slotKey = getBestComparisonSlot(itemName);
  const slotLabel = slotKey ? EQUIPMENT_SLOT_LABELS[slotKey] : "slot";
  const currentItemName = slotKey ? gameState.equipped[slotKey] : null;

  if (!currentItemName) {
    return `Compare ${slotLabel}: empty now, new item gives ${getSlotPrimaryStatText(itemName, slotKey)}.`;
  }

  const currentItem = items[currentItemName];
  const newItem = items[itemName];
  const statKey = newItem.type === "weapon" ? "attackBonus" : "defenseBonus";
  const difference = newItem[statKey] - currentItem[statKey];

  if (difference > 0) {
    return `Compare ${slotLabel}: ${currentItemName} (${getSlotPrimaryStatText(currentItemName, slotKey)}) -> ${itemName} (${getSlotPrimaryStatText(itemName, slotKey)}). Improves by ${difference}.`;
  }

  if (difference < 0) {
    return `Compare ${slotLabel}: ${currentItemName} (${getSlotPrimaryStatText(currentItemName, slotKey)}) -> ${itemName} (${getSlotPrimaryStatText(itemName, slotKey)}). Worse by ${Math.abs(difference)}.`;
  }

  return `Compare ${slotLabel}: same strength as ${currentItemName}.`;
}

function getLootComparisonLines(itemNames) {
  return itemNames
    .filter((itemName) => isEquippableItem(itemName))
    .map((itemName) => `${itemName}: ${getEquipmentComparisonText(itemName)}`);
}

function getLootMessage(itemNames) {
  const comparisonLines = getLootComparisonLines(itemNames);

  if (comparisonLines.length === 0) {
    return "";
  }

  return ` ${comparisonLines.join(" ")}`;
}

function equipItem(itemName, slotKey) {
  if (!gameState.inventory.includes(itemName) || gameState.inCombat) {
    return;
  }

  const itemData = items[itemName];
  if (!isEquippableItem(itemName) || !getItemSlotOptions(itemName).includes(slotKey)) {
    showSystemMessage(`${itemName} cannot be equipped in ${EQUIPMENT_SLOT_LABELS[slotKey]}.`, "bad");
    return;
  }

  if (itemData.type === "armor" && !["head", "torso", "leftArm", "rightArm", "legs"].includes(slotKey)) {
    showSystemMessage(`${itemName} is armor and cannot be equipped in a weapon slot.`, "bad");
    return;
  }

  if (itemData.type === "weapon" && !["weaponMainHand", "weaponOffHand"].includes(slotKey)) {
    showSystemMessage(`${itemName} is a weapon and must be equipped in a hand slot.`, "bad");
    return;
  }

  if (slotKey === "weaponOffHand" && !getItemSlotOptions(itemName).includes("weaponOffHand")) {
    showSystemMessage(`${itemName} must stay in the main hand.`, "bad");
    return;
  }

  const previouslyEquipped = gameState.equipped[slotKey];
  if (previouslyEquipped) {
    addItem(previouslyEquipped);
  }

  removeItem(itemName);
  gameState.equipped[slotKey] = itemName;
  updateStats();
  renderInventory();
  showSystemMessage(`${itemName} equipped to ${EQUIPMENT_SLOT_LABELS[slotKey]}.`, "good");
  addCombatEvent(`${itemName} equipped to ${EQUIPMENT_SLOT_LABELS[slotKey]}.`);
}

function unequipItem(slotKey) {
  if (gameState.inCombat) {
    return;
  }

  const itemName = gameState.equipped[slotKey];
  if (!itemName) {
    return;
  }

  addItem(itemName);
  gameState.equipped[slotKey] = null;
  updateStats();
  renderInventory();
  showSystemMessage(`${itemName} moved back to your inventory.`, "neutral");
  addCombatEvent(`${itemName} unequipped from ${EQUIPMENT_SLOT_LABELS[slotKey]}.`);
}

function buildEquipmentSummaryLines() {
  const weaponInfo = getWeaponAttackDetails();
  const armorLines = getArmorSummaryLines();
  const injuryLines = getEquipmentInjuryLines();

  return [
    weaponInfo.summary,
    ...armorLines
    ,
    ...injuryLines
  ];
}

function getArmorSummaryLines() {
  const lines = [];

  const headArmor = getEquippedDefenseForSlot("head");
  const torsoArmor = getEquippedDefenseForSlot("torso");
  const leftArmArmor = getEquippedDefenseForSlot("leftArm");
  const rightArmArmor = getEquippedDefenseForSlot("rightArm");
  const legArmor = getEquippedDefenseForSlot("legs");

  lines.push(headArmor > 0 ? `Head armor: reduces head hits by ${headArmor}.` : "Head armor: none equipped.");
  lines.push(torsoArmor > 0 ? `Torso armor: reduces torso hits by ${torsoArmor}.` : "Torso armor: none equipped.");
  lines.push(
    leftArmArmor > 0 || rightArmArmor > 0
      ? `Arm armor: left ${leftArmArmor}, right ${rightArmArmor}.`
      : "Arm armor: none equipped."
  );
  lines.push(legArmor > 0 ? `Leg armor: reduces leg hits by ${legArmor}.` : "Leg armor: none equipped.");

  return lines;
}

function getEquipmentInjuryLines() {
  const lines = [];

  if (gameState.equipped.weaponMainHand && gameState.bodyParts.rightArm === "disabled") {
    lines.push(`Main-hand warning: ${gameState.equipped.weaponMainHand} cannot be used because your right arm is disabled.`);
  } else if (gameState.equipped.weaponMainHand && gameState.bodyParts.rightArm !== "healthy") {
    lines.push(`Main-hand warning: your right arm injury makes ${gameState.equipped.weaponMainHand} less effective.`);
  }

  if (gameState.equipped.weaponOffHand && gameState.bodyParts.leftArm === "disabled") {
    lines.push(`Off-hand warning: ${gameState.equipped.weaponOffHand} cannot be used because your left arm is disabled.`);
  } else if (gameState.equipped.weaponOffHand && gameState.bodyParts.leftArm !== "healthy") {
    lines.push(`Off-hand warning: your left arm injury makes ${gameState.equipped.weaponOffHand} less effective.`);
  }

  if (gameState.equipped.leftArm && gameState.bodyParts.leftArm !== "healthy") {
    lines.push(`Left arm armor still protects you, but the damaged arm reduces how well you use gear there.`);
  }

  if (gameState.equipped.rightArm && gameState.bodyParts.rightArm !== "healthy") {
    lines.push(`Right arm armor still protects you, but the damaged arm reduces how well you use gear there.`);
  }

  return lines;
}

function getCurrentShip() {
  return ships[gameState.currentShip];
}

function getCurrentRoom() {
  return getCurrentShip().rooms[gameState.currentRoom];
}

function hasProgressFlag(flagKey) {
  return Boolean(gameState.progressFlags[flagKey]);
}

function setProgressFlag(flagKey, value = true) {
  gameState.progressFlags[flagKey] = value;
}

function getVisitedRoomKey(shipKey, roomKey) {
  return `${shipKey}:${roomKey}`;
}

function hasVisitedRoom(shipKey, roomKey) {
  return Boolean(gameState.visitedRooms[getVisitedRoomKey(shipKey, roomKey)]);
}

function markCurrentRoomVisited() {
  gameState.visitedRooms[getVisitedRoomKey(gameState.currentShip, gameState.currentRoom)] = true;
}

function getReadableScreenName(screen) {
  if (screen === GAME_SCREENS.EXPLORATION) {
    return "Exploration";
  }

  if (screen === GAME_SCREENS.COMBAT) {
    return "Combat";
  }

  if (screen === GAME_SCREENS.VICTORY) {
    return "Victory";
  }

  if (screen === GAME_SCREENS.DEFEAT) {
    return "Defeat";
  }

  return "Title";
}

function getCurrentLocationLabel() {
  if (gameState.screen === GAME_SCREENS.VICTORY || gameState.screen === GAME_SCREENS.DEFEAT) {
    return "Outcome";
  }

  if (gameState.screen === GAME_SCREENS.COMBAT || gameState.screen === GAME_SCREENS.EXPLORATION) {
    return `${getCurrentShip().name} - ${getCurrentRoom().name}`;
  }

  return "-";
}

function canUseRoomAction(actionKey) {
  if (actionKey === "claimBingus") {
    if (isSingularityCoreUnlocked()) {
      return !hasProgressFlag("crystalBingusClaimed");
    }

    return !hasProgressFlag("vaultPlaceholderTaken");
  }

  const action = ROOM_ACTIONS[actionKey];
  return Boolean(action && (!action.onceFlag || !hasProgressFlag(action.onceFlag)));
}

function getRoomActionLabel(actionKey) {
  if (actionKey === "claimBingus") {
    return isSingularityCoreUnlocked()
      ? "Take The Singularity Core"
      : "Inspect the sealed vault housing";
  }

  return ROOM_ACTIONS[actionKey].label;
}

function getSlotArmState(slotKey) {
  if (slotKey === "weaponMainHand" || slotKey === "rightArm") {
    return gameState.bodyParts.rightArm;
  }

  if (slotKey === "weaponOffHand" || slotKey === "leftArm") {
    return gameState.bodyParts.leftArm;
  }

  return "healthy";
}

function getSlotEffectiveness(slotKey) {
  const armState = getSlotArmState(slotKey);

  if (armState === "disabled") {
    return 0;
  }

  if (armState === "critical") {
    return 0.35;
  }

  if (armState === "injured") {
    return 0.7;
  }

  return 1;
}

function getWeaponSlotEffectiveness(slotKey) {
  return getSlotEffectiveness(slotKey);
}

function getArmorSlotEffectiveness(slotKey) {
  const armState = getSlotArmState(slotKey);

  if (armState === "critical") {
    return 0.8;
  }

  if (armState === "injured") {
    return 0.9;
  }

  return 1;
}

function getWeaponAttackDetails() {
  const weaponSlots = ["weaponMainHand", "weaponOffHand"];
  const detailLines = [];
  let totalBonus = 0;

  weaponSlots.forEach((slotKey) => {
    const itemName = gameState.equipped[slotKey];
    if (!itemName) {
      return;
    }

    const itemData = items[itemName];
    const effectiveness = getWeaponSlotEffectiveness(slotKey);
    const effectiveBonus = Math.floor(itemData.attackBonus * effectiveness);
    totalBonus += effectiveBonus;

    if (effectiveness === 0) {
      detailLines.push(`${itemName} is unusable because that arm is disabled.`);
      return;
    }

    if (effectiveness < 1) {
      detailLines.push(`${itemName} adds ${effectiveBonus} attack because the arm is injured.`);
      return;
    }

    detailLines.push(`${itemName} adds ${effectiveBonus} attack.`);
  });

  return {
    totalBonus,
    details: detailLines,
    summary: detailLines.length
      ? `Weapon bonus: ${totalBonus} total. ${detailLines.join(" ")}`
      : "Weapon bonus: no weapons equipped."
  };
}

function getWeaponBonusMessage(prefix = "Weapon bonus") {
  const weaponInfo = getWeaponAttackDetails();

  if (weaponInfo.totalBonus <= 0 || weaponInfo.details.length === 0) {
    return "";
  }

  return `\n${prefix}: ${weaponInfo.details.join(" ")}`;
}

function getAttackDiceBonusBadges(rollResult, weaponInfo) {
  const combinedBonus = rollResult.bonus + weaponInfo.totalBonus;
  return combinedBonus > 0 ? [`+${combinedBonus}`] : [];
}

function getEquippedDefenseForSlot(slotKey) {
  const itemName = gameState.equipped[slotKey];
  if (!itemName) {
    return 0;
  }

  const itemData = items[itemName];
  const effectiveness = itemData.type === "weapon"
    ? getWeaponSlotEffectiveness(slotKey)
    : getArmorSlotEffectiveness(slotKey);
  return Math.floor(itemData.defenseBonus * effectiveness);
}

function getArmorReductionForBodyPart(partKey) {
  if (partKey === "head") {
    return getEquippedDefenseForSlot("head");
  }

  if (partKey === "torso") {
    return getEquippedDefenseForSlot("torso");
  }

  if (partKey === "leftArm") {
    return getEquippedDefenseForSlot("leftArm");
  }

  if (partKey === "rightArm") {
    return getEquippedDefenseForSlot("rightArm");
  }

  if (partKey === "leftLeg" || partKey === "rightLeg") {
    return getEquippedDefenseForSlot("legs");
  }

  return 0;
}

function moveToRoom(roomKey, shipKey = gameState.currentShip) {
  gameState.currentShip = shipKey;
  gameState.currentRoom = roomKey;
  const room = getCurrentRoom();
  markCurrentRoomVisited();

  if (room.encounter && !hasProgressFlag(room.encounter.clearFlag)) {
    startCombat(room.encounter.enemy, roomKey);
    return;
  }

  gameState.screen = GAME_SCREENS.EXPLORATION;
  renderCurrentView();
}

function travelThroughConnection(connection) {
  if (connection.toShip) {
    moveToRoom(connection.toRoom, connection.toShip);
    showSystemMessage(`You travel to ${ships[connection.toShip].name}.`, "neutral");
    addCombatEvent(`You travelled to ${ships[connection.toShip].name}, arriving in ${ships[connection.toShip].rooms[connection.toRoom].name}.`);
    return;
  }

  moveToRoom(connection.to);
}

function runRoomAction(actionKey) {
  const action = ROOM_ACTIONS[actionKey];

  if (!action) {
    return;
  }

  if (action.onceFlag && !(actionKey === "claimBingus" && !isSingularityCoreUnlocked())) {
    setProgressFlag(action.onceFlag);
  }

  if (actionKey === "starterCache") {
    findStarterCache();
    return;
  }

  if (actionKey === "healingInjector") {
    healAtStation();
    return;
  }

  if (actionKey === "medBayDrawer") {
    openSupplyDrawer();
    return;
  }

  if (actionKey === "cargoCredits") {
    collectTreasure();
    return;
  }

  if (actionKey === "claimBingus") {
    winGame();
    return;
  }

  if (actionKey === "solarMedLocker") {
    findSolarMedLocker();
    return;
  }

  if (actionKey === "marketStash") {
    searchMarketStash();
    return;
  }

  if (actionKey === "beaconGold") {
    collectBeaconGold();
    return;
  }

  if (actionKey === "willyWackerCache") {
    findWillyWacker();
  }
}

function findStarterCache() {
  const foundItems = ["Med Patch", "Nano Salve", "Shield Cell", "Rusty Knife", "Padded Hood"];
  foundItems.forEach((itemName) => addItem(itemName));
  gameState.gold += 2;
  updateStats();
  renderInventory();
  showSystemMessage(`You found a Med Patch, a Nano Salve, a Shield Cell, a Rusty Knife, a Padded Hood, and 2 credits.${getLootMessage(foundItems)}`, "good");
  playSound("item");
  playSound("gold");
  addCombatEvent("You found starter supplies, including a Rusty Knife and a Padded Hood.");
  renderCurrentView();
}

async function healAtStation() {
  const healRoll = rollDice(1, 6, 0);
  await showDiceRoll("Healing injector roll", healRoll);
  const restoredHealth = Math.min(healRoll.total, gameState.maxHealth - gameState.health);
  gameState.health += restoredHealth;
  updateStats();
  showSystemMessage(`Healing injector used. You recover ${restoredHealth} health.`, "good");
  playSound("heal");
  renderInventory();
  addCombatEvent(`Healing injector restores ${restoredHealth} health.`);
  renderCurrentView();
}

function openSupplyDrawer() {
  const foundItems = ["Med Patch", "Repair Kit", "Arm Guard"];
  foundItems.forEach((itemName) => addItem(itemName));
  updateStats();
  renderInventory();
  showSystemMessage(`You found a Med Patch, a Repair Kit, and an Arm Guard in the med bay drawer.${getLootMessage(foundItems)}`, "good");
  playSound("item");
  addCombatEvent("You found a Med Patch, a Repair Kit, and an Arm Guard in the med bay drawer.");
  renderCurrentView();
}

function collectTreasure() {
  gameState.gold += 15;
  updateStats();
  showSystemMessage("Treasure collected. You gain 15 gold.", "good");
  playSound("gold");
  addCombatEvent("You collected 15 gold from the cargo hold.");
  renderCurrentView();
}

function findSolarMedLocker() {
  const foundItems = ["Med Patch", "Nano Salve", "Reinforced Vest"];
  foundItems.forEach((itemName) => addItem(itemName));
  updateStats();
  renderInventory();
  showSystemMessage(`You open the sterile cache and recover a Med Patch, a Nano Salve, and a Reinforced Vest.${getLootMessage(foundItems)}`, "good");
  playSound("item");
  addCombatEvent("You recovered medical supplies and a Reinforced Vest from the Sunpiercer cache.");
  renderCurrentView();
}

function searchMarketStash() {
  const foundItems = ["Shield Cell", "Repair Kit", "Shock Baton"];
  foundItems.forEach((itemName) => addItem(itemName));
  gameState.gold += 6;
  updateStats();
  renderInventory();
  showSystemMessage(`The smuggler stash yields a Shield Cell, a Repair Kit, a Shock Baton, and 6 credits.${getLootMessage(foundItems)}`, "good");
  playSound("item");
  playSound("gold");
  addCombatEvent("You cracked open the market stash and found useful gear, including a Shock Baton.");
  renderCurrentView();
}

function collectBeaconGold() {
  gameState.gold += 10;
  const foundItems = ["Leg Plating"];
  foundItems.forEach((itemName) => addItem(itemName));
  updateStats();
  showSystemMessage(`You pull 10 credits and Leg Plating from the beacon reward locker.${getLootMessage(foundItems)}`, "good");
  playSound("gold");
  playSound("item");
  addCombatEvent("You collected a 10-credit bounty and Leg Plating from the signal loft.");
  renderCurrentView();
}

function getVaultChamberText(state) {
  if (isSingularityCoreUnlocked()) {
    return `The Singularity Core rises from the center of the vault in a column of light. With ${state.gold} credits in your pack and the station groaning around you, the path back to your shuttle is clear.`;
  }

  if (hasProgressFlag("vaultPlaceholderTaken")) {
    return `A sealed vault housing hums in the chamber center. You already stripped loose credits from the outer casing, but the true prize remains locked away until you have fully mapped at least two stations.`;
  }

  return `A sealed vault housing hums in the chamber center. Warning glyphs flicker around the chamber, suggesting the true prize will only reveal itself after you have fully mapped at least two stations.`;
}

function inspectSealedVaultHousing() {
  const placeholderGold = 12;
  gameState.gold += placeholderGold;
  setProgressFlag("vaultPlaceholderTaken");
  updateStats();
  showSystemMessage(`The vault housing stays sealed, but you salvage ${placeholderGold} credits from the outer casing. Fully explore at least 2 stations to unlock the true prize.`, "neutral");
  playSound("gold");
  addCombatEvent("You salvaged credits from the sealed vault housing, but the true prize remains locked.");
  renderCurrentView();
}

function findWillyWacker() {
  const foundItems = ["Tim Taser"];
  foundItems.forEach((itemName) => addItem(itemName));
  updateStats();
  renderInventory();
  showSystemMessage(`You crack open the strange cache and find the Tim Taser.${getLootMessage(foundItems)}`, "good");
  playSound("item");
  addCombatEvent("You discovered the hidden Tim Taser.");
  renderCurrentView();
}

function renderCurrentCombatView() {
  const classData = classes[gameState.playerClass];
  const enemyData = getCurrentEnemy();

  gameState.screen = GAME_SCREENS.COMBAT;
  sceneTitle.textContent = `Combat: ${gameState.combat.enemyName}`;
  storyText.textContent = enemyData.intro;
  combatLog.classList.remove("hidden");
  combatLog.textContent =
    `${gameState.combat.enemyName} Health: ${gameState.combat.enemyHealth}\nYour Health: ${gameState.health}\nYour class is ${classData.name}.\nSpecial ability: ${classData.abilityName}. ${classData.abilityText}\n${enemyData.targetStyleText}\nWhen anyone attacks or heals, the dice spin first and then land on the result.`;

  renderCombatChoices();
  renderRoomMap();
  renderInventory();
  playSound("combat");
}

function startCombat(enemyKey, returnRoom = gameState.currentRoom, returnShip = gameState.currentShip) {
  const enemyTemplate = enemies[enemyKey];

  gameState.inCombat = true;
  gameState.combat = {
    key: enemyKey,
    enemyName: enemyTemplate.name,
    enemyHealth: enemyTemplate.health,
    attackDice: enemyTemplate.attackDice,
    rewardGold: enemyTemplate.rewardGold,
    returnRoom,
    returnShip
  };

  renderCurrentCombatView();
  addCombatEvent(`Combat begins against ${enemyTemplate.name}.`);
}

function renderCombatChoices() {
  const classData = classes[gameState.playerClass];
  const abilityChoice = buildAbilityChoice(classData);

  renderChoices([
    { text: "Attack", action: playerAttack },
    abilityChoice,
    { text: "Flee", action: attemptFlee },
    { text: "Save Game", action: saveGame }
  ]);

  updateAbilityCooldownUI();
  scheduleAbilityCooldownSync();
}

function buildAbilityChoice(classData) {
  const classKey = gameState.playerClass;
  const abilityReady = isClassAbilityReady(classKey);
  const remainingMs = getAbilityCooldownRemaining(classKey);
  const label = abilityReady
    ? classData.abilityName
    : `${classData.abilityName} (${formatCooldownTime(remainingMs)})`;

  return {
    text: label,
    html: `<span class="ability-button-label">${label}</span>`,
    action: useClassAbility,
    className: "ability-button",
    disabled: !abilityReady,
    dataset: {
      abilityClass: classKey
    }
  };
}

async function playerAttack() {
  if (!gameState.inCombat || !gameState.combat) {
    return;
  }

  const playerRoll = rollDice(1, 6, 1);
  const weaponInfo = getWeaponAttackDetails();
  const weaponBonusMessage = getWeaponBonusMessage();
  await showDiceRoll("Your attack roll", playerRoll, {
    bonusBadges: getAttackDiceBonusBadges(playerRoll, weaponInfo)
  });
  const attackResult = resolveAttackOutcome({
    rawPower: playerRoll.total + weaponInfo.totalBonus,
    accuracyThreshold: getCurrentPenalties().headAccuracyPenalty,
    missMessage: "Head damage throws off your aim and the attack misses.",
    hitMessage: (attackPower) =>
      `Your attack lands for ${attackPower} damage.${weaponBonusMessage}\nYou hit the ${gameState.combat.enemyName} for ${attackPower} damage.`,
    zeroDamageMessage: "Your injuries leave the strike too weak to do damage."
  });

  if (attackResult.missed) {
    addCombatEvent(attackResult.message);
    await applyEnemyCounterattack(attackResult.message, "hits");
    playSound("attack");
    return;
  }

  gameState.combat.enemyHealth -= attackResult.attackPower;
  addCombatEvent(`You hit ${gameState.combat.enemyName} for ${attackResult.attackPower} damage.`);

  if (gameState.combat.enemyHealth <= 0) {
    winCombat(attackResult.message);
    return;
  }

  await applyEnemyCounterattack(attackResult.message, "hits");
  playSound("attack");
}

async function useClassAbility() {
  if (!gameState.inCombat || !gameState.combat) {
    return;
  }

  if (!isClassAbilityReady(gameState.playerClass)) {
    const remaining = formatCooldownTime(getAbilityCooldownRemaining(gameState.playerClass));
    combatLog.classList.remove("hidden");
    combatLog.textContent =
      `${classes[gameState.playerClass].abilityName} is recharging for ${remaining}.\n${gameState.combat.enemyName} Health: ${gameState.combat.enemyHealth}\nYour Health: ${gameState.health}`;
    return;
  }

  const classData = classes[gameState.playerClass];
  startAbilityCooldown(gameState.playerClass);
  updateAbilityCooldownUI();

  if (gameState.playerClass === "grunt") {
    const roll = classData.useAbility();
    const weaponInfo = getWeaponAttackDetails();
    const weaponBonusMessage = getWeaponBonusMessage("Weapon support");
    await showDiceRoll(`${classData.abilityName} roll`, roll, {
      bonusBadges: getAttackDiceBonusBadges(roll, weaponInfo)
    });
    const headPenalty = getCurrentPenalties().headAccuracyPenalty;
    const attackResult = resolveAttackOutcome({
      rawPower: roll.total + weaponInfo.totalBonus,
      accuracyThreshold: headPenalty > 0 ? Math.max(1, headPenalty - 1) : 0,
      missMessage: `You use ${classData.abilityName}.\nYour injuries ruin the blow and it fails to deal damage.`,
      hitMessage: (attackPower) =>
        `You use ${classData.abilityName}.${weaponBonusMessage}\nYou smash the ${gameState.combat.enemyName} for ${attackPower} damage.`,
      zeroDamageMessage: `You use ${classData.abilityName}.\nYour injuries ruin the blow and it fails to deal damage.`
    });

    if (!attackResult.missed) {
      gameState.combat.enemyHealth -= attackResult.attackPower;
    }
    addCombatEvent(attackResult.message.replace("\n", " "));

    if (gameState.combat.enemyHealth <= 0) {
      winCombat(attackResult.message);
      return;
    }

    await applyEnemyCounterattack(attackResult.message, "hits");
    playSound("ability");
    return;
  }

  if (gameState.playerClass === "smuggler") {
    const ability = classData.useAbility();
    const penalties = getCurrentPenalties();
    const weaponInfo = getWeaponAttackDetails();
    await showDiceRoll(`${classData.abilityName} roll`, ability.attackRoll, {
      bonusBadges: getAttackDiceBonusBadges(ability.attackRoll, weaponInfo)
    });
    const attackPower = Math.max(0, ability.attackRoll.total + weaponInfo.totalBonus - penalties.attackPenalty);
    const dodgeFails = penalties.dodgePenalty > 0 && randomNumber(1, 6) <= penalties.dodgePenalty;
    if (attackPower > 0) {
      gameState.combat.enemyHealth -= attackPower;
    }

    let logMessage =
      `You use ${classData.abilityName}.${getWeaponBonusMessage("Weapon support")}\nYou strike the ${gameState.combat.enemyName} for ${attackPower} damage.`;
    addCombatEvent(logMessage.replace("\n", " "));

    if (gameState.combat.enemyHealth <= 0) {
      winCombat(logMessage);
      return;
    }

    if (dodgeFails) {
      await applyEnemyCounterattack(`${logMessage}\nLeg injuries stop you from dodging cleanly.`, "hits");
      playSound("ability");
      return;
    }

    updateStats();
    combatLog.classList.remove("hidden");
    combatLog.textContent =
      `${logMessage}\nThe ${gameState.combat.enemyName}'s attack misses because of Shadow Step.\n${gameState.combat.enemyName} Health: ${gameState.combat.enemyHealth}\nYour Health: ${gameState.health}`;
    renderInventory();
    playSound("ability");
    return;
  }

  if (gameState.playerClass === "cyborg") {
    const roll = classData.useAbility();
    const weaponInfo = getWeaponAttackDetails();
    const weaponBonusMessage = getWeaponBonusMessage("Weapon support");
    await showDiceRoll(`${classData.abilityName} roll`, roll, {
      bonusBadges: getAttackDiceBonusBadges(roll, weaponInfo)
    });
    const headPenalty = getCurrentPenalties().headAccuracyPenalty;
    const attackResult = resolveAttackOutcome({
      rawPower: roll.total + weaponInfo.totalBonus,
      accuracyThreshold: headPenalty > 0 ? Math.max(1, headPenalty - 1) : 0,
      missMessage: `You use ${classData.abilityName}.\nThe plasma burst goes wide because of your injuries.`,
      hitMessage: (attackPower) =>
        `You use ${classData.abilityName}.${weaponBonusMessage}\nThe plasma burst hits the ${gameState.combat.enemyName} for ${attackPower} damage.`,
      zeroDamageMessage: `You use ${classData.abilityName}.\nThe plasma burst goes wide because of your injuries.`
    });

    if (!attackResult.missed) {
      gameState.combat.enemyHealth -= attackResult.attackPower;
    }
    addCombatEvent(attackResult.message.replace("\n", " "));

    if (gameState.combat.enemyHealth <= 0) {
      winCombat(attackResult.message);
      return;
    }

    await applyEnemyCounterattack(attackResult.message, "hits");
    playSound("ability");
  }
}

async function useInventoryItem(itemName) {
  if (!gameState.inventory.includes(itemName)) {
    showSystemMessage(`You do not have a ${itemName}.`, "bad");
    return;
  }

  const itemData = items[itemName];
  if (itemData.combatOnly && !gameState.inCombat) {
    showSystemMessage(`${itemName} can only be used during combat.`, "bad");
    return;
  }

  const result = itemData.use();
  if (result.consumeItem !== false) {
    removeItem(itemName);
  }
  if (result.roll) {
    await showDiceRoll(`${itemName} roll`, result.roll);
  }

  if (result.targetedBodyHeal) {
    beginTargetedBodyHeal(itemName);
    return;
  }

  updateStats();
  renderInventory();

  if (!gameState.inCombat) {
    showSystemMessage(result.message, "good");
    playSound(result.type === "heal" ? "heal" : "item");
    addCombatEvent(result.message);
    return;
  }

  let logMessage = result.message;
  addCombatEvent(result.message);

  if (gameState.combat.enemyHealth <= 0) {
    winCombat(logMessage);
    return;
  }

  await applyEnemyCounterattack(logMessage, "hits");
  playSound(result.type === "heal" ? "heal" : "item");
}

function beginTargetedBodyHeal(itemName) {
  const injuredParts = getInjuredBodyParts();

  if (injuredParts.length === 0) {
    showSystemMessage(`${itemName} has no effect because no body parts are injured.`, "bad");
    addItem(itemName);
    renderInventory();
    return;
  }

  sceneTitle.textContent = "Choose Body Part";
  storyText.textContent = "Select one injured body part to heal by one step.";
  combatLog.classList.add("hidden");

  const choices = injuredParts.map((partKey) => ({
    text: `Heal ${getReadableBodyPartName(partKey)} (${gameState.bodyParts[partKey]})`,
    action: () => finishTargetedBodyHeal(itemName, partKey)
  }));

  if (gameState.inCombat) {
    choices.push({
      text: "Cancel and keep the item",
      action: () => cancelTargetedBodyHeal(itemName)
    });
  } else {
    choices.push({
      text: "Cancel and keep the item",
      action: () => cancelTargetedBodyHeal(itemName, true)
    });
  }

  renderChoices(choices);
}

function finishTargetedBodyHeal(itemName, partKey) {
  const healedPart = healBodyPart(partKey);
  updateStats();
  renderInventory();

  if (!healedPart) {
    showSystemMessage(`${itemName} could not heal that body part.`, "bad");
    addItem(itemName);
    renderInventory();
    return;
  }

  const message = `${itemName} heals your ${healedPart.readableName} from ${healedPart.fromState} to ${healedPart.toState}.`;
  showSystemMessage(message, "good");
  addCombatEvent(message);
  playSound("heal");

  if (gameState.inCombat && gameState.combat) {
    combatLog.classList.remove("hidden");
    combatLog.textContent = `${message}\n${gameState.combat.enemyName} Health: ${gameState.combat.enemyHealth}\nYour Health: ${gameState.health}`;
    renderCombatChoices();
    return;
  }

  renderCurrentView();
}

function cancelTargetedBodyHeal(itemName, returnToScene = false) {
  addItem(itemName);
  renderInventory();
  showSystemMessage(`${itemName} was not used.`, "neutral");

  if (gameState.inCombat && gameState.combat) {
    renderCurrentCombatView();
    return;
  }

  if (returnToScene) {
    renderCurrentView();
  }
}

async function attemptFlee() {
  if (!gameState.inCombat || !gameState.combat) {
    return;
  }

  const penalties = getCurrentPenalties();
  if (penalties.cannotFlee) {
    combatLog.classList.remove("hidden");
    combatLog.textContent =
      `Your disabled leg prevents you from fleeing.\n${gameState.combat.enemyName} Health: ${gameState.combat.enemyHealth}\nYour Health: ${gameState.health}`;
    return;
  }

  const fleeChance = Math.max(1, 4 - penalties.fleePenalty);
  const escaped = randomNumber(1, 6) <= fleeChance;

  if (escaped) {
    gameState.inCombat = false;
    gameState.combat = null;
    gameState.currentRoom = getCurrentShip().startRoom;
    gameState.screen = GAME_SCREENS.EXPLORATION;
    gameState.lastBodyHitText = "You escaped before taking another hit.";
    addCombatEvent("You successfully fled from combat.");
    renderCurrentView();
    return;
  }

  addCombatEvent("You tried to flee, but the enemy blocked your path.");
  await applyEnemyCounterattack("You try to flee, but the enemy cuts you off.", "hits");
}

async function applyEnemyCounterattack(logMessage, hitVerb) {
  const enemyData = getCurrentEnemy();
  const enemyRoll = rollDice(
    gameState.combat.attackDice.count,
    gameState.combat.attackDice.sides,
    gameState.combat.attackDice.bonus
  );
  await showDiceRoll(`${gameState.combat.enemyName} attack roll`, enemyRoll);
  const hitPart = chooseEnemyTargetBodyPart();
  const penalties = getCurrentPenalties();
  const armorReduction = getArmorReductionForBodyPart(hitPart);
  let damage = Math.max(0, enemyRoll.total + penalties.torsoDamageBonus - armorReduction);
  let blockMessage = "";

  if (gameState.shieldBlock > 0) {
    const blocked = Math.min(gameState.shieldBlock, damage);
    damage -= blocked;
    blockMessage = `\nYour Shield Cell blocks ${blocked} damage.`;
    gameState.shieldBlock = 0;
  }

  gameState.health -= damage;
  playSound("damage");
  const bodyHit = applyBodyDamage(hitPart);
  addCombatEvent(`Enemy hit your ${bodyHit.readableName}. It is now ${bodyHit.state}.`);
  if (armorReduction > 0) {
    addCombatEvent(`Your armor reduced damage to your ${bodyHit.readableName} by ${armorReduction}.`);
  }
  const armorMessage = armorReduction > 0
    ? `\nYour armor reduces the hit by ${armorReduction}.`
    : "";
  logMessage +=
    `\nThe ${gameState.combat.enemyName} attacks.${blockMessage}${armorMessage}\n${enemyData.targetStyleText}\nThe ${gameState.combat.enemyName} ${hitVerb} you for ${damage} damage.\nYour ${bodyHit.readableName} is hit and is now ${bodyHit.state}.`;

  if (gameState.health <= 0) {
    gameState.health = 0;
    updateStats();
    combatLog.classList.remove("hidden");
    combatLog.textContent = `${logMessage}\nYou collapse in the fight.`;
    gameState.inCombat = false;
    gameState.combat = null;
    gameState.screen = GAME_SCREENS.DEFEAT;
    renderChoices([{ text: "See your fate", action: renderCurrentView }]);
    renderInventory();
    playSound("defeat");
    return;
  }

  updateStats();
  combatLog.classList.remove("hidden");
  combatLog.textContent =
    `${logMessage}\n${gameState.combat.enemyName} Health: ${gameState.combat.enemyHealth}\nYour Health: ${gameState.health}`;
  renderInventory();
  renderBodyStatus();
}

function winCombat(logMessage) {
  const defeatedEnemyName = gameState.combat.enemyName;
  const returnRoom = gameState.combat.returnRoom;
  const returnShip = gameState.combat.returnShip;
  const room = getCurrentRoom();
  const enemyData = getCurrentEnemy();
  const lootItems = enemyData.loot || [];

  if (room.encounter?.clearFlag) {
    setProgressFlag(room.encounter.clearFlag);
  }

  gameState.gold += gameState.combat.rewardGold;
  lootItems.forEach((itemName) => addItem(itemName));
  gameState.inCombat = false;
  gameState.combat = null;
  updateStats();
  combatLog.classList.remove("hidden");
  combatLog.textContent =
    `${logMessage}\nYou defeat the ${defeatedEnemyName} and gain ${enemyData.rewardGold} gold.${lootItems.length ? `\nLoot found: ${lootItems.join(", ")}.` : ""}`;
  renderChoices([{
    text: "Continue exploring",
    action: () => finishCombat(returnRoom, returnShip)
  }]);
  renderInventory();
  playSound("gold");
  if (lootItems.length) {
    playSound("item");
    showSystemMessage(`You defeated ${defeatedEnemyName} and found ${lootItems.join(", ")}.${getLootMessage(lootItems)}`, "good");
  }
  playSound("victory");
  addCombatEvent(`You defeated ${defeatedEnemyName}.${lootItems.length ? ` Loot found: ${lootItems.join(", ")}.` : ""}`);
}

function winGame() {
  if (!isSingularityCoreUnlocked()) {
    inspectSealedVaultHousing();
    return;
  }

  addItem("The Singularity Core");
  gameState.screen = GAME_SCREENS.VICTORY;
  showSystemMessage("Mission complete. The Singularity Core is yours.", "good");
  playSound("triumph");
  playSound("victory");
  renderCurrentView();
}

function finishCombat(returnRoom, returnShip = gameState.currentShip) {
  gameState.currentShip = returnShip;
  gameState.currentRoom = returnRoom;
  gameState.screen = GAME_SCREENS.EXPLORATION;
  renderCurrentView();
}

function mapLegacySceneToRoom(sceneKey) {
  const legacyRoomMap = {
    arrivalBay: "arrivalBay",
    mainCorridor: "mainCorridor",
    medBay: "medBay",
    cargoHold: "cargoHold",
    vaultDoor: "vaultDoor",
    vaultChamber: "vaultChamber"
  };

  return legacyRoomMap[sceneKey] || ships.starfallDepths.startRoom;
}

function restartGame() {
  Object.assign(gameState, createDefaultState());
  syncVisibleScreens();
  playerNameInput.focus();
  showSystemMessage("Ready for a new mission.", "neutral");
  renderInventory();
}

function addItem(itemName) {
  gameState.inventory.push(itemName);
}

function removeItem(itemName) {
  const itemIndex = gameState.inventory.indexOf(itemName);
  if (itemIndex >= 0) {
    gameState.inventory.splice(itemIndex, 1);
  }
}

function addCombatEvent(message) {
  gameState.recentCombatEvents.unshift(message);
  gameState.recentCombatEvents = gameState.recentCombatEvents.slice(0, 5);
  renderBodyStatus();
}

function getCurrentEnemy() {
  return enemies[gameState.combat.key];
}

// This keeps the normal attack and special attack rules in one place.
function resolveAttackOutcome({ rawPower, accuracyThreshold, missMessage, hitMessage, zeroDamageMessage }) {
  const penalties = getCurrentPenalties();
  const attackPower = Math.max(0, rawPower - penalties.attackPenalty);
  const missedForAccuracy =
    accuracyThreshold > 0 && randomNumber(1, 6) <= accuracyThreshold;

  if (missedForAccuracy) {
    return {
      missed: true,
      attackPower: 0,
      message: missMessage
    };
  }

  if (attackPower <= 0) {
    return {
      missed: true,
      attackPower: 0,
      message: zeroDamageMessage
    };
  }

  return {
    missed: false,
    attackPower,
    message: hitMessage(attackPower)
  };
}

function saveGame() {
  try {
    const saveState = {
      ...gameState,
      screen: gameState.screen === GAME_SCREENS.SETTINGS
        ? gameState.previousScreen || GAME_SCREENS.EXPLORATION
        : gameState.screen
    };
    localStorage.setItem(SAVE_KEY, JSON.stringify(saveState));
    updateLoadButton();
    showSystemMessage("Game saved to your browser.", "good");
    playSound("save");
  } catch (error) {
    showSystemMessage("Save failed. Your browser may be blocking local storage.", "bad");
  }
}

function loadGame() {
  try {
    const savedData = localStorage.getItem(SAVE_KEY);
    if (!savedData) {
      showSystemMessage("No saved game was found.", "bad");
      return;
    }

    const parsed = JSON.parse(savedData);
    Object.assign(gameState, createDefaultState(), parsed);
    migrateLegacyTreasureReferences(gameState);
    ensureAbilityCooldownsShape(gameState);

    if (!parsed.currentRoom && parsed.currentScene) {
      gameState.currentRoom = mapLegacySceneToRoom(parsed.currentScene);
    }

    if (!parsed.currentShip) {
      gameState.currentShip = "starfallDepths";
    }

    if (!parsed.progressFlags) {
      gameState.progressFlags = {};
    }

    if (!parsed.visitedRooms) {
      gameState.visitedRooms = {};
      gameState.visitedRooms[getVisitedRoomKey(gameState.currentShip, gameState.currentRoom)] = true;
    }

    if (!parsed.willyWackerLocation) {
      gameState.willyWackerLocation = pickRandomWillyWackerLocation();
    }

    if (gameState.inCombat && gameState.combat && !gameState.combat.returnRoom) {
      gameState.combat.returnRoom = gameState.currentRoom;
    }

    if (gameState.inCombat && gameState.combat && !gameState.combat.returnShip) {
      gameState.combat.returnShip = gameState.currentShip;
    }

    if (!gameState.screen || gameState.screen === GAME_SCREENS.TITLE) {
      gameState.screen = gameState.inCombat ? GAME_SCREENS.COMBAT : GAME_SCREENS.EXPLORATION;
    }

    if (gameState.screen === GAME_SCREENS.SETTINGS) {
      gameState.screen = gameState.previousScreen || GAME_SCREENS.EXPLORATION;
    }

    syncVisibleScreens();
    showSystemMessage("Saved game loaded from your browser.", "good");

    if (gameState.inCombat && gameState.combat) {
      gameState.screen = GAME_SCREENS.COMBAT;
      renderCurrentView();
      playSound("load");
      return;
    }

    renderCurrentView();
    playSound("load");
    updateAbilityCooldownUI();
  } catch (error) {
    showSystemMessage("Load failed because the saved data could not be read.", "bad");
  }
}

function updateLoadButton() {
  loadButton.disabled = !localStorage.getItem(SAVE_KEY);
}

function migrateLegacyTreasureReferences(state) {
  if (Array.isArray(state.inventory)) {
    state.inventory = state.inventory.map((itemName) =>
      itemName === "The Crystal Bingus"
        ? "The Singularity Core"
        : itemName === "Willy Wacker" || itemName === "Tim Tazer"
          ? "Tim Taser"
          : itemName
    );
  }
}

function ensureAbilityCooldownsShape(state) {
  state.abilityCooldowns = {
    ...createDefaultAbilityCooldowns(),
    ...(state.abilityCooldowns || {})
  };
}

function showSystemMessage(message, tone) {
  systemMessage.textContent = message;
  systemMessage.dataset.tone = tone;
}

function rollDice(count, sides, bonus) {
  const rolls = [];

  for (let index = 0; index < count; index += 1) {
    rolls.push(randomNumber(1, sides));
  }

  const rollsTotal = rolls.reduce((sum, roll) => sum + roll, 0);

  return {
    rolls,
    bonus,
    total: rollsTotal + bonus
  };
}

function describeDice(dice) {
  if (dice.bonus > 0) {
    return `${dice.count}d${dice.sides} + ${dice.bonus}`;
  }

  return `${dice.count}d${dice.sides}`;
}

function formatRoll(rollResult) {
  const joinedRolls = rollResult.rolls.join(" + ");

  if (rollResult.bonus > 0) {
    return `${joinedRolls} + ${rollResult.bonus} = ${rollResult.total}`;
  }

  return `${joinedRolls} = ${rollResult.total}`;
}

async function showDiceRoll(label, rollResult, options = {}) {
  diceLabel.textContent = label;
  diceDisplay.innerHTML = "";
  diceTray.classList.remove("hidden");

  rollResult.rolls.forEach((finalValue) => {
    const die = document.createElement("div");
    die.className = "die spinning";
    die.textContent = randomNumber(1, Math.max(finalValue, 6));
    diceDisplay.appendChild(die);
  });

  const bonusBadges = options.bonusBadges || (rollResult.bonus > 0 ? [`+${rollResult.bonus}`] : []);
  bonusBadges.forEach((badgeText) => {
    const bonus = document.createElement("div");
    bonus.className = "dice-bonus";
    bonus.textContent = badgeText;
    diceDisplay.appendChild(bonus);
  });

  const dieElements = Array.from(diceDisplay.querySelectorAll(".die"));

  const animationStart = Date.now();
  while (Date.now() - animationStart < 1000) {
    dieElements.forEach((die, index) => {
      die.textContent = randomNumber(1, Math.max(rollResult.rolls[index], 6));
    });
    await wait(120);
  }

  dieElements.forEach((die, index) => {
    die.classList.remove("spinning");
    die.textContent = rollResult.rolls[index];
  });

  await wait(250);
}

function hideDiceTray() {
  diceTray.classList.add("hidden");
  diceLabel.textContent = "";
  diceDisplay.innerHTML = "";
}

function wait(milliseconds) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, milliseconds);
  });
}

function isClassAbilityReady(classKey) {
  return getAbilityCooldownRemaining(classKey) <= 0;
}

function getAbilityCooldownRemaining(classKey) {
  const readyAt = gameState.abilityCooldowns?.[classKey] || 0;
  return Math.max(0, readyAt - Date.now());
}

function getAbilityCooldownProgress(classKey) {
  const remainingMs = getAbilityCooldownRemaining(classKey);
  return Math.max(0, Math.min(1, 1 - remainingMs / ABILITY_COOLDOWN_MS));
}

function formatCooldownTime(milliseconds) {
  const totalSeconds = Math.ceil(milliseconds / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

function startAbilityCooldown(classKey) {
  gameState.abilityCooldowns[classKey] = Date.now() + ABILITY_COOLDOWN_MS;
  scheduleAbilityCooldownSync();
}

function updateAbilityCooldownUI() {
  const abilityButton = choicesContainer.querySelector(".ability-button");

  if (!abilityButton) {
    return;
  }

  const classKey = abilityButton.dataset.abilityClass;
  const classData = classes[classKey];
  const ready = isClassAbilityReady(classKey);
  const progress = getAbilityCooldownProgress(classKey);
  const remainingMs = getAbilityCooldownRemaining(classKey);
  const nextState = ready ? "ready" : "cooling";
  const previousState = abilityButton.dataset.cooldownState || nextState;
  const label = ready
    ? classData.abilityName
    : `${classData.abilityName} (${formatCooldownTime(remainingMs)})`;

  abilityButton.innerHTML = `<span class="ability-button-label">${label}</span>`;
  abilityButton.disabled = !ready;
  abilityButton.dataset.cooldownState = nextState;
  abilityButton.classList.toggle("cooling-down", !ready);
  abilityButton.classList.toggle("ability-ready", ready);
  abilityButton.style.setProperty("--cooldown-progress", String(progress));

  if (previousState === "cooling" && ready) {
    triggerAbilityReadyPulse(abilityButton);
  }
}

function scheduleAbilityCooldownSync() {
  if (abilityCooldownSyncTimer) {
    window.clearTimeout(abilityCooldownSyncTimer);
    abilityCooldownSyncTimer = null;
  }

  if (!gameState.inCombat) {
    return;
  }

  const remainingMs = getAbilityCooldownRemaining(gameState.playerClass);

  if (remainingMs <= 0) {
    updateAbilityCooldownUI();
    return;
  }

  abilityCooldownSyncTimer = window.setTimeout(() => {
    updateAbilityCooldownUI();
    scheduleAbilityCooldownSync();
  }, remainingMs + 20);
}

function triggerAbilityReadyPulse(button) {
  if (abilityReadyPulseTimer) {
    window.clearTimeout(abilityReadyPulseTimer);
  }

  button.classList.remove("ability-ready-pulse");
  void button.offsetWidth;
  button.classList.add("ability-ready-pulse");

  abilityReadyPulseTimer = window.setTimeout(() => {
    button.classList.remove("ability-ready-pulse");
  }, 900);
}

function randomNumber(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pickRandomWillyWackerLocation() {
  const possibleLocations = [
    { ship: "starfallDepths", room: "cargoHold" },
    { ship: "sunpiercer", room: "solarAtrium" },
    { ship: "sunpiercer", room: "sunBridge" },
    { ship: "driftMarket", room: "smugglerNook" },
    { ship: "driftMarket", room: "bazaarSpine" }
  ];

  return possibleLocations[randomNumber(0, possibleLocations.length - 1)];
}

function shouldShowWillyWackerCache() {
  const cacheLocation = gameState.willyWackerLocation;

  if (!cacheLocation || hasProgressFlag("willyWackerFound")) {
    return false;
  }

  return cacheLocation.ship === gameState.currentShip && cacheLocation.room === gameState.currentRoom;
}

function isShipFullyExplored(shipKey) {
  const ship = ships[shipKey];

  if (!ship) {
    return false;
  }

  return Object.keys(ship.rooms).every((roomKey) => hasVisitedRoom(shipKey, roomKey));
}

function getFullyExploredShipCount() {
  return Object.keys(ships).filter((shipKey) => isShipFullyExplored(shipKey)).length;
}

function isSingularityCoreUnlocked() {
  return getFullyExploredShipCount() >= 2;
}

function playSound(type) {
  const source = soundEffects[type];

  if (!source) {
    return;
  }

  const audio = source.cloneNode();
  audio.currentTime = 0;
  audio.volume = masterVolume;
  audio.play().catch(() => {});
}

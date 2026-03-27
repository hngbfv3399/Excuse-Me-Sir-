const CHARACTERS = {
  DEFAULT_RUNNER: { baseSpeed: 3 },
  HEALER_RUNNER: { baseSpeed: 2.8 },
  DEFAULT_TAGGER: { baseSpeed: 3.2 }
};

function getCharacterSpeed(charId) {
  return CHARACTERS[charId]?.baseSpeed || 3;
}

module.exports = { getCharacterSpeed };

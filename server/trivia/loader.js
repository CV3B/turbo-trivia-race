const fs = require('fs');
const path = require('path');

const packsDir = path.join(__dirname, 'packs');

function loadPack(packName) {
  const filePath = path.join(packsDir, `${packName}.json`);
  const data = fs.readFileSync(filePath, 'utf8');
  return JSON.parse(data);
}

function listPacks() {
  const files = fs.readdirSync(packsDir).filter(f => f.endsWith('.json'));
  return files.map(f => {
    const pack = loadPack(f.replace('.json', ''));
    return {
      id: f.replace('.json', ''),
      name: pack.name,
      description: pack.description,
      questionCount: pack.questions.length
    };
  });
}

module.exports = { loadPack, listPacks };

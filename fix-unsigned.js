// fix-unsigned.js
// Ejecutar UNA vez desde la raíz del proyecto:
//   node fix-unsigned.js
//
// Reemplaza DataTypes.BIGINT.UNSIGNED  → DataTypes.BIGINT
//           DataTypes.SMALLINT.UNSIGNED → DataTypes.SMALLINT
//           DataTypes.INTEGER.UNSIGNED  → DataTypes.INTEGER
// en todos los archivos .model.js de src/models/

const fs   = require('fs');
const path = require('path');

const MODELS_DIR = path.join(__dirname, 'src', 'models');

const replacements = [
  [/DataTypes\.BIGINT\.UNSIGNED/g,   'DataTypes.BIGINT'],
  [/DataTypes\.SMALLINT\.UNSIGNED/g, 'DataTypes.SMALLINT'],
  [/DataTypes\.INTEGER\.UNSIGNED/g,  'DataTypes.INTEGER'],
];

fs.readdirSync(MODELS_DIR)
  .filter(f => f.endsWith('.model.js'))
  .forEach(file => {
    const filePath = path.join(MODELS_DIR, file);
    let content    = fs.readFileSync(filePath, 'utf8');
    let changed    = false;

    replacements.forEach(([pattern, replacement]) => {
      if (pattern.test(content)) {
        content = content.replace(pattern, replacement);
        changed = true;
      }
    });

    if (changed) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`✅ Fixed: ${file}`);
    } else {
      console.log(`— Skipped: ${file}`);
    }
  });

console.log('\nDone. Reinicia el servidor.');
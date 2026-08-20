// src/models/index.js
'use strict';

const fs       = require('fs');
const path     = require('path');
const { sequelize } = require('../config/db');

const basename = path.basename(__filename);
const db       = {};

// Cargar todos los modelos automáticamente
fs.readdirSync(__dirname)
  .filter(file =>
    file.indexOf('.') !== 0 &&
    file !== basename &&
    file.slice(-9) === '.model.js'
  )
  .forEach(file => {
    const model  = require(path.join(__dirname, file));
    db[model.name] = model;
  });

// Ejecutar las asociaciones de cada modelo
Object.keys(db).forEach(modelName => {
  if (db[modelName].associate) {
    db[modelName].associate(db);
  }
});

db.sequelize = sequelize;
db.Sequelize  = require('sequelize');

module.exports = db;
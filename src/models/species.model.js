const { DataTypes, Model } = require('sequelize');
const { sequelize } = require('../config/db');

class Species extends Model {
  static associate(db) {
    Species.hasMany(db.Breed,           { foreignKey: 'species_id', as: 'breeds'   });
    Species.hasMany(db.Pet,             { foreignKey: 'species_id', as: 'pets'     });
    Species.hasMany(db.AdoptionListing, { foreignKey: 'species_id', as: 'listings' });
  }
}

Species.init(
  {
    id:     { type: DataTypes.SMALLINT, primaryKey: true, autoIncrement: true },
    name:   { type: DataTypes.STRING(60), allowNull: false, unique: true },
    active: { type: DataTypes.BOOLEAN,    allowNull: false, defaultValue: true },
  },
  {
    sequelize,
    modelName:  'Species',
    tableName:  'species',
    timestamps: false,
  }
);

module.exports = Species;
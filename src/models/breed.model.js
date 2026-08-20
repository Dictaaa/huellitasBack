const { DataTypes, Model } = require('sequelize');
const { sequelize } = require('../config/db');

class Breed extends Model {
  static associate(db) {
    Breed.belongsTo(db.Species, { foreignKey: 'species_id', as: 'species' });
    Breed.hasMany(db.Pet,       { foreignKey: 'breed_id',   as: 'pets'    });
  }
}

Breed.init(
  {
    id:         { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    species_id: { type: DataTypes.SMALLINT, allowNull: false },
    name:       { type: DataTypes.STRING(100), allowNull: false },
    active:     { type: DataTypes.BOOLEAN,     allowNull: false, defaultValue: true },
  },
  {
    sequelize,
    modelName:  'Breed',
    tableName:  'breeds',
    timestamps: false,
    indexes: [{ unique: true, fields: ['species_id', 'name'] }],
  }
);

module.exports = Breed;
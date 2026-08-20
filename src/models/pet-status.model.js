const { DataTypes, Model } = require('sequelize');
const { sequelize } = require('../config/db');

class PetStatus extends Model {
  static associate(db) {
    PetStatus.hasMany(db.Pet, { foreignKey: 'status_id', as: 'pets' });
  }
}

PetStatus.init(
  {
    id:          { type: DataTypes.SMALLINT,    primaryKey: true, autoIncrement: true },
    name:        { type: DataTypes.STRING(40),  allowNull: false, unique: true },
    description: { type: DataTypes.STRING(120), allowNull: true  },
  },
  {
    sequelize,
    modelName:  'PetStatus',
    tableName:  'pet_statuses',
    timestamps: false,
  }
);

module.exports = PetStatus;
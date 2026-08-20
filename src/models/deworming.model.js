const { DataTypes, Model } = require('sequelize');
const { sequelize } = require('../config/db');

class Deworming extends Model {
  static associate(db) {
    Deworming.belongsTo(db.Pet, { foreignKey: 'pet_id', as: 'pet' });
  }
}

Deworming.init(
  {
    id:           { type: DataTypes.BIGINT,     primaryKey: true, autoIncrement: true },
    pet_id:       { type: DataTypes.BIGINT,     allowNull: false },
    product_name: { type: DataTypes.STRING(120),allowNull: false },
    applied_at:   { type: DataTypes.DATEONLY,   allowNull: false },
    next_due_at:  { type: DataTypes.DATEONLY,   allowNull: true  },
    deworming_type: {
      type:         DataTypes.ENUM('internal','external','both'),
      allowNull:    false,
      defaultValue: 'internal',
    },
    notes:        { type: DataTypes.TEXT,       allowNull: true  },
  },
  {
    sequelize,
    modelName:  'Deworming',
    tableName:  'dewormings',
    timestamps: true,
    createdAt:  'created_at',
    updatedAt:  false,
  }
);

module.exports = Deworming;
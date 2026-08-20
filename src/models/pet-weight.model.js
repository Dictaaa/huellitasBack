const { DataTypes, Model } = require('sequelize');
const { sequelize } = require('../config/db');

class PetWeight extends Model {
  static associate(db) {
    PetWeight.belongsTo(db.Pet, { foreignKey: 'pet_id', as: 'pet' });
  }
}

PetWeight.init(
  {
    id:          { type: DataTypes.BIGINT,    primaryKey: true, autoIncrement: true },
    pet_id:      { type: DataTypes.BIGINT,    allowNull: false },
    weight:      { type: DataTypes.DECIMAL(5,2), allowNull: false },
    weight_unit: {
      type:         DataTypes.ENUM('kg','lb'),
      allowNull:    false,
      defaultValue: 'kg',
    },
    measured_at: { type: DataTypes.DATEONLY,    allowNull: false },
    notes:       { type: DataTypes.STRING(200), allowNull: true  },
  },
  {
    sequelize,
    modelName:  'PetWeight',
    tableName:  'pet_weights',
    timestamps: true,
    createdAt:  'created_at',
    updatedAt:  false,
  }
);

module.exports = PetWeight;
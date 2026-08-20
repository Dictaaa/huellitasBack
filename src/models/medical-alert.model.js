const { DataTypes, Model } = require('sequelize');
const { sequelize } = require('../config/db');

class MedicalAlert extends Model {
  static associate(db) {
    MedicalAlert.belongsTo(db.Pet, { foreignKey: 'pet_id', as: 'pet' });
  }
}

MedicalAlert.init(
  {
    id:         { type: DataTypes.BIGINT,      primaryKey: true, autoIncrement: true },
    pet_id:     { type: DataTypes.BIGINT,      allowNull: false },
    alert_type: {
      type:      DataTypes.ENUM('allergy','condition','restriction','medication','other'),
      allowNull: false,
    },
    title:       { type: DataTypes.STRING(120), allowNull: false },
    description: { type: DataTypes.TEXT,        allowNull: true  },
    severity: {
      type:         DataTypes.ENUM('low','medium','high','critical'),
      allowNull:    false,
      defaultValue: 'medium',
    },
    show_on_public_profile: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    active:                 { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true  },
  },
  {
    sequelize,
    modelName:  'MedicalAlert',
    tableName:  'medical_alerts',
    timestamps: true,
    createdAt:  'created_at',
    updatedAt:  false,
  }
);

module.exports = MedicalAlert;
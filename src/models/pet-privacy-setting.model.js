// src/models/pet-privacy-setting.model.js
const { DataTypes, Model } = require('sequelize');
const { sequelize } = require('../config/db');

class PetPrivacySetting extends Model {
  static associate(db) {
    PetPrivacySetting.belongsTo(db.Pet, { foreignKey: 'pet_id', as: 'pet' });
  }
}

PetPrivacySetting.init(
  {
    id: {
      type:          DataTypes.BIGINT,
      primaryKey:    true,
      autoIncrement: true,
    },
    pet_id: {
      type:      DataTypes.BIGINT,
      allowNull: false,
      unique:    true,
    },
    show_pet_name:         { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true  },
    show_photo:            { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true  },
    show_breed:            { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true  },
    show_age:              { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true  },
    show_weight:           { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    show_medical_alerts:   { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true  },
    show_owner_name:       { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true  },
    show_phone:            { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    show_city:             { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true  },
    allow_whatsapp:        { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true  },
    allow_call:            { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    allow_location_report: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true  },
  },
  {
    sequelize,
    modelName:  'PetPrivacySetting',
    tableName:  'pet_privacy_settings',
    timestamps: true,
    createdAt:  false,
    updatedAt:  'updated_at',
  }
);

module.exports = PetPrivacySetting;
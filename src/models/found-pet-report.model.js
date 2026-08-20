// src/models/found-pet-report.model.js
const { DataTypes, Model } = require('sequelize');
const { sequelize } = require('../config/db');

class FoundPetReport extends Model {
  static associate(db) {
    FoundPetReport.belongsTo(db.PetTag,       { foreignKey: 'pet_tag_id',     as: 'tag'        });
    FoundPetReport.belongsTo(db.Pet,          { foreignKey: 'pet_id',         as: 'pet'        });
    FoundPetReport.belongsTo(db.LostPetReport,{ foreignKey: 'lost_report_id', as: 'lostReport' });
  }
}

FoundPetReport.init(
  {
    id: {
      type:          DataTypes.BIGINT,
      primaryKey:    true,
      autoIncrement: true,
    },
    pet_tag_id:     { type: DataTypes.BIGINT, allowNull: false },
    pet_id:         { type: DataTypes.BIGINT, allowNull: true  },
    lost_report_id: { type: DataTypes.BIGINT, allowNull: true  },

    finder_name:    { type: DataTypes.STRING(100),  allowNull: true },
    finder_phone:   { type: DataTypes.STRING(20),   allowNull: true },
    finder_message: { type: DataTypes.TEXT,          allowNull: true },
    found_location: { type: DataTypes.STRING(200),  allowNull: true },
    found_lat:      { type: DataTypes.DECIMAL(10,7),allowNull: true },
    found_lng:      { type: DataTypes.DECIMAL(10,7),allowNull: true },
    found_at:       { type: DataTypes.DATE,          allowNull: false, defaultValue: DataTypes.NOW },

    status: {
      type:         DataTypes.ENUM('pending', 'contacted', 'resolved'),
      allowNull:    false,
      defaultValue: 'pending',
    },
  },
  {
    sequelize,
    modelName:  'FoundPetReport',
    tableName:  'found_pet_reports',
    timestamps: true,
    createdAt:  'created_at',
    updatedAt:  false,
  }
);

module.exports = FoundPetReport;
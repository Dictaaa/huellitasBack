// src/models/lost-pet-report.model.js
const { DataTypes, Model } = require('sequelize');
const { sequelize } = require('../config/db');

class LostPetReport extends Model {
  isActive() { return this.status === 'active'; }

  static associate(db) {
    LostPetReport.belongsTo(db.Pet,  { foreignKey: 'pet_id',              as: 'pet'      });
    LostPetReport.belongsTo(db.User, { foreignKey: 'reported_by_user_id', as: 'reporter' });
    LostPetReport.hasMany(db.FoundPetReport, { foreignKey: 'lost_report_id', as: 'foundReports' });
  }
}

LostPetReport.init(
  {
    id: {
      type:          DataTypes.BIGINT,
      primaryKey:    true,
      autoIncrement: true,
    },
    pet_id:              { type: DataTypes.BIGINT, allowNull: false },
    reported_by_user_id: { type: DataTypes.BIGINT, allowNull: false },

    lost_at:             { type: DataTypes.DATE,         allowNull: false },
    last_seen_location:  { type: DataTypes.STRING(200),  allowNull: true  },
    last_seen_lat:       { type: DataTypes.DECIMAL(10,7),allowNull: true  },
    last_seen_lng:       { type: DataTypes.DECIMAL(10,7),allowNull: true  },
    description:         { type: DataTypes.TEXT,         allowNull: true  },
    contact_phone:       { type: DataTypes.STRING(20),   allowNull: true  },
    contact_name:        { type: DataTypes.STRING(100),  allowNull: true  },

    status: {
      type:         DataTypes.ENUM('active', 'found', 'closed'),
      allowNull:    false,
      defaultValue: 'active',
    },
    found_at: { type: DataTypes.DATE, allowNull: true },
  },
  {
    sequelize,
    modelName:  'LostPetReport',
    tableName:  'lost_pet_reports',
    timestamps: true,
    createdAt:  'created_at',
    updatedAt:  'updated_at',
    scopes: {
      active: { where: { status: 'active' } },
    },
  }
);

module.exports = LostPetReport;
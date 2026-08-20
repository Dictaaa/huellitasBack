// src/models/vaccination.model.js
const { DataTypes, Model } = require('sequelize');
const { sequelize } = require('../config/db');

class Vaccination extends Model {
  isDue() {
    if (!this.next_due_at) return false;
    return new Date(this.next_due_at) <= new Date();
  }

  static associate(db) {
    Vaccination.belongsTo(db.Pet,  { foreignKey: 'pet_id',          as: 'pet'          });
    Vaccination.belongsTo(db.User, { foreignKey: 'veterinarian_id', as: 'veterinarian' });
    Vaccination.hasMany(db.Reminder, { foreignKey: 'vaccination_id', as: 'reminders'   });
  }
}

Vaccination.init(
  {
    id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
    pet_id:          { type: DataTypes.BIGINT, allowNull: false },
    veterinarian_id: { type: DataTypes.BIGINT, allowNull: true  },
    vaccine_name:    { type: DataTypes.STRING(120),     allowNull: false },
    batch_number:    { type: DataTypes.STRING(60),      allowNull: true  },
    applied_at:      { type: DataTypes.DATEONLY,        allowNull: false },
    next_due_at:     { type: DataTypes.DATEONLY,        allowNull: true  },
    notes:           { type: DataTypes.TEXT,            allowNull: true  },
  },
  {
    sequelize,
    modelName:  'Vaccination',
    tableName:  'vaccinations',
    timestamps: true,
    createdAt:  'created_at',
    updatedAt:  false,
  }
);

module.exports = Vaccination;
// src/models/reminder.model.js
const { DataTypes, Model } = require('sequelize');
const { sequelize } = require('../config/db');

class Reminder extends Model {
  static associate(db) {
    Reminder.belongsTo(db.Pet,         { foreignKey: 'pet_id',        as: 'pet'         });
    Reminder.belongsTo(db.User,        { foreignKey: 'user_id',       as: 'user'        });
    Reminder.belongsTo(db.Vaccination, { foreignKey: 'vaccination_id',as: 'vaccination' });
    Reminder.belongsTo(db.Appointment, { foreignKey: 'appointment_id',as: 'appointment' });
  }
}

Reminder.init(
  {
    id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
    pet_id:  { type: DataTypes.BIGINT, allowNull: false },
    user_id: { type: DataTypes.BIGINT, allowNull: false },

    reminder_type: {
      type:      DataTypes.ENUM('vaccine','deworming','medication','appointment','birthday','checkup','other'),
      allowNull: false,
    },
    title:          { type: DataTypes.STRING(120), allowNull: false },
    description:    { type: DataTypes.TEXT,        allowNull: true  },
    due_at:         { type: DataTypes.DATE,        allowNull: false },

    recurrence: {
      type:         DataTypes.ENUM('none','weekly','monthly','yearly'),
      allowNull:    false,
      defaultValue: 'none',
    },
    recurrence_end:    { type: DataTypes.DATE,    allowNull: true  },
    notify_email:      { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true  },
    notify_sms:        { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    notify_push:       { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true  },
    notify_days_before:{ type: DataTypes.SMALLINT,allowNull: false, defaultValue: 3     },

    status: {
      type:         DataTypes.ENUM('pending','sent','dismissed','done'),
      allowNull:    false,
      defaultValue: 'pending',
    },
    sent_at:         { type: DataTypes.DATE,            allowNull: true },
    vaccination_id:  { type: DataTypes.BIGINT, allowNull: true },
    appointment_id:  { type: DataTypes.BIGINT, allowNull: true },
  },
  {
    sequelize,
    modelName:  'Reminder',
    tableName:  'reminders',
    timestamps: true,
    createdAt:  'created_at',
    updatedAt:  'updated_at',
  }
);

module.exports = Reminder;
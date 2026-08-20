const { DataTypes, Model } = require('sequelize');
const { sequelize } = require('../config/db');

class Appointment extends Model {
  static associate(db) {
    Appointment.belongsTo(db.Pet,               { foreignKey: 'pet_id',          as: 'pet'          });
    Appointment.belongsTo(db.Organization,      { foreignKey: 'organization_id', as: 'clinic'       });
    Appointment.belongsTo(db.User,              { foreignKey: 'veterinarian_id', as: 'veterinarian' });
    Appointment.belongsTo(db.AppointmentStatus, { foreignKey: 'status_id',       as: 'status'       });
    Appointment.hasMany(db.Reminder,            { foreignKey: 'appointment_id',  as: 'reminders'    });
  }
}

Appointment.init(
  {
    id:               { type: DataTypes.BIGINT,     primaryKey: true, autoIncrement: true },
    pet_id:           { type: DataTypes.BIGINT,     allowNull: false },
    organization_id:  { type: DataTypes.BIGINT,     allowNull: true  },
    veterinarian_id:  { type: DataTypes.BIGINT,     allowNull: true  },
    status_id:        { type: DataTypes.SMALLINT,   allowNull: false },
    appointment_date: { type: DataTypes.DATE,       allowNull: false },
    appointment_type: { type: DataTypes.STRING(60), allowNull: true  },
    duration_minutes: { type: DataTypes.SMALLINT,   allowNull: true, defaultValue: 30 },
    notes:            { type: DataTypes.TEXT,       allowNull: true  },
    created_by:       { type: DataTypes.BIGINT,     allowNull: true  },
  },
  {
    sequelize,
    modelName:  'Appointment',
    tableName:  'appointments',
    timestamps: true,
    createdAt:  'created_at',
    updatedAt:  'updated_at',
  }
);

module.exports = Appointment;
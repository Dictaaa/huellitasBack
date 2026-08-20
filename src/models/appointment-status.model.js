const { DataTypes, Model } = require('sequelize');
const { sequelize } = require('../config/db');

class AppointmentStatus extends Model {
  static associate(db) {
    AppointmentStatus.hasMany(db.Appointment, { foreignKey: 'status_id', as: 'appointments' });
  }
}

AppointmentStatus.init(
  {
    id:          { type: DataTypes.SMALLINT,    primaryKey: true, autoIncrement: true },
    name:        { type: DataTypes.STRING(40),  allowNull: false, unique: true },
    description: { type: DataTypes.STRING(120), allowNull: true  },
  },
  {
    sequelize,
    modelName:  'AppointmentStatus',
    tableName:  'appointment_statuses',
    timestamps: false,
  }
);

module.exports = AppointmentStatus;
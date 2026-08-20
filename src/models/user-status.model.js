const { DataTypes, Model } = require('sequelize');
const { sequelize } = require('../config/db');

class UserStatus extends Model {
  static associate(db) {
    UserStatus.hasMany(db.User, { foreignKey: 'status_id', as: 'users' });
  }
}

UserStatus.init(
  {
    id:          { type: DataTypes.SMALLINT,    primaryKey: true, autoIncrement: true },
    name:        { type: DataTypes.STRING(40),  allowNull: false, unique: true },
    description: { type: DataTypes.STRING(120), allowNull: true  },
  },
  {
    sequelize,
    modelName:  'UserStatus',
    tableName:  'user_statuses',
    timestamps: false,
  }
);

module.exports = UserStatus;
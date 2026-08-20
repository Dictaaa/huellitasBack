const { DataTypes, Model } = require('sequelize');
const { sequelize } = require('../config/db');

class OrganizationUser extends Model {
  static associate(db) {
    OrganizationUser.belongsTo(db.Organization, { foreignKey: 'organization_id', as: 'organization' });
    OrganizationUser.belongsTo(db.User,         { foreignKey: 'user_id',         as: 'user'         });
  }
}

OrganizationUser.init(
  {
    id:              { type: DataTypes.BIGINT,     primaryKey: true, autoIncrement: true },
    organization_id: { type: DataTypes.BIGINT,     allowNull: false },
    user_id:         { type: DataTypes.BIGINT,     allowNull: false },
    role:            { type: DataTypes.STRING(40), allowNull: false, defaultValue: 'staff' },
    active:          { type: DataTypes.BOOLEAN,    allowNull: false, defaultValue: true   },
    joined_at:       { type: DataTypes.DATE,       allowNull: false, defaultValue: DataTypes.NOW },
  },
  {
    sequelize,
    modelName:  'OrganizationUser',
    tableName:  'organization_users',
    timestamps: false,
    indexes:    [{ unique: true, fields: ['organization_id', 'user_id'] }],
  }
);

module.exports = OrganizationUser;
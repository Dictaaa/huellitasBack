// src/models/user.model.js
const { DataTypes, Model } = require('sequelize');
const bcrypt = require('bcryptjs');
const { sequelize } = require('../config/db');

class User extends Model {

  // ── Métodos de instancia ──────────────────────────────
  async checkPassword(plainPassword) {
    return bcrypt.compare(plainPassword, this.password_hash);
  }

  getFullName() {
    return `${this.first_name} ${this.last_name}`;
  }

  isActive() {
    return this.active && !this.deleted_at;
  }

  // ── Asociaciones ──────────────────────────────────────
  static associate(db) {
    User.belongsTo(db.Role,       { foreignKey: 'role_id',   as: 'role'   });
    User.belongsTo(db.UserStatus, { foreignKey: 'status_id', as: 'status' });

    User.hasMany(db.Subscription, { foreignKey: 'user_id', as: 'subscriptions' });
    User.hasMany(db.Payment,      { foreignKey: 'user_id', as: 'payments'      });
    User.hasMany(db.Pet,          { foreignKey: 'owner_user_id', as: 'pets'    });

    User.hasMany(db.OrganizationUser, { foreignKey: 'user_id', as: 'organizationLinks' });
    User.hasMany(db.LostPetReport,    { foreignKey: 'reported_by_user_id', as: 'lostReports' });
    User.hasMany(db.AuditLog,         { foreignKey: 'user_id', as: 'auditLogs' });
  }
}

User.init(
  {
    id: {
      type:          DataTypes.BIGINT,
      primaryKey:    true,
      autoIncrement: true,
    },
    role_id: {
      type:      DataTypes.SMALLINT,
      allowNull: false,
    },
    status_id: {
      type:         DataTypes.SMALLINT,
      allowNull:    false,
      defaultValue: 1,
    },
    first_name: {
      type:      DataTypes.STRING(80),
      allowNull: false,
      validate:  { len: [2, 80] },
    },
    last_name: {
      type:      DataTypes.STRING(80),
      allowNull: false,
      validate:  { len: [2, 80] },
    },
    email: {
      type:      DataTypes.STRING(180),
      allowNull: false,
      unique:    true,
      validate:  { isEmail: true },
    },
    phone: {
      type:      DataTypes.STRING(20),
      allowNull: true,
    },
    city: {
      type:      DataTypes.STRING(80),
      allowNull: true,
    },
    country_code: {
      type:         DataTypes.CHAR(2),
      allowNull:    false,
      defaultValue: 'CO',
    },
    password_hash: {
      type:      DataTypes.STRING(255),
      allowNull: false,
    },
    email_verified: {
      type:         DataTypes.BOOLEAN,
      allowNull:    false,
      defaultValue: false,
    },
    active: {
      type:         DataTypes.BOOLEAN,
      allowNull:    false,
      defaultValue: true,
    },
    last_login_at: {
      type:      DataTypes.DATE,
      allowNull: true,
    },
    deleted_at: {
      type:      DataTypes.DATE,
      allowNull: true,
    },
    created_by: { type: DataTypes.BIGINT, allowNull: true },
    updated_by: { type: DataTypes.BIGINT, allowNull: true },
  },
  {
    sequelize,
    modelName:  'User',
    tableName:  'users',
    timestamps: true,
    createdAt:  'created_at',
    updatedAt:  'updated_at',
    paranoid:   false,  // manejamos soft delete manualmente con deleted_at

    // Nunca devolver el hash en las respuestas
    defaultScope: {
      attributes: { exclude: ['password_hash'] },
    },
    scopes: {
      withPassword: { attributes: {} },  // sin exclusiones — para login
      active:       { where: { active: true, deleted_at: null } },
    },

    hooks: {
      // Hash automático antes de crear o actualizar contraseña
      beforeCreate: async (user) => {
        if (user.password_hash) {
          user.password_hash = await bcrypt.hash(user.password_hash, 12);
        }
      },
      beforeUpdate: async (user) => {
        if (user.changed('password_hash')) {
          user.password_hash = await bcrypt.hash(user.password_hash, 12);
        }
      },
    },
  }
);

module.exports = User;
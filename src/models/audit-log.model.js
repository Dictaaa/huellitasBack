// src/models/audit-log.model.js
const { DataTypes, Model } = require('sequelize');
const { sequelize } = require('../config/db');

class AuditLog extends Model {
  static associate(db) {
    AuditLog.belongsTo(db.User, { foreignKey: 'user_id', as: 'user' });
  }

  // Helper estático para registrar desde cualquier parte del código
  static async log({ userId, action, entityType, entityId, oldValues, newValues, ipAddress, userAgent }) {
    return AuditLog.create({
      user_id:     userId     || null,
      action,
      entity_type: entityType,
      entity_id:   entityId,
      old_values:  oldValues  || null,
      new_values:  newValues  || null,
      ip_address:  ipAddress  || null,
      user_agent:  userAgent  || null,
    });
  }
}

AuditLog.init(
  {
    id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
    user_id:     { type: DataTypes.BIGINT, allowNull: true  },
    action:      { type: DataTypes.STRING(80),      allowNull: false,
                   comment: 'pet.created | tag.assigned | subscription.cancelled' },
    entity_type: { type: DataTypes.STRING(60),      allowNull: false,
                   comment: 'pets | pet_tags | subscriptions | ...' },
    entity_id:   { type: DataTypes.BIGINT, allowNull: false },
    old_values:  { type: DataTypes.JSONB,           allowNull: true  },
    new_values:  { type: DataTypes.JSONB,           allowNull: true  },
    ip_address:  { type: DataTypes.STRING(45),      allowNull: true  },
    user_agent:  { type: DataTypes.STRING(300),     allowNull: true  },
    created_at:  { type: DataTypes.DATE,            allowNull: false, defaultValue: DataTypes.NOW },
  },
  {
    sequelize,
    modelName:  'AuditLog',
    tableName:  'audit_logs',
    timestamps: false,   // solo created_at, manejado manualmente
  }
);

module.exports = AuditLog;
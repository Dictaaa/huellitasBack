// src/models/subscription.model.js
const { DataTypes, Model, Op } = require('sequelize');
const { sequelize } = require('../config/db');

class Subscription extends Model {
  // ── Helpers ───────────────────────────────────────────
  isActive() {
    return (
      this.status_id === 1 &&                          // status: active
      (!this.ends_at || new Date(this.ends_at) > new Date())
    );
  }

  isExpired() {
    return this.ends_at && new Date(this.ends_at) <= new Date();
  }

  daysRemaining() {
    if (!this.ends_at) return null;
    const diff = new Date(this.ends_at) - new Date();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  }

  // ── Asociaciones ──────────────────────────────────────
  static associate(db) {
    Subscription.belongsTo(db.User,               { foreignKey: 'user_id',   as: 'user'   });
    Subscription.belongsTo(db.Plan,               { foreignKey: 'plan_id',   as: 'plan'   });
    Subscription.belongsTo(db.SubscriptionStatus, { foreignKey: 'status_id', as: 'status' });

    Subscription.hasMany(db.Pet,     { foreignKey: 'subscription_id', as: 'pets'     });
    Subscription.hasMany(db.Payment, { foreignKey: 'subscription_id', as: 'payments' });
  }
}

Subscription.init(
  {
    id: {
      type:          DataTypes.BIGINT,
      primaryKey:    true,
      autoIncrement: true,
    },
    user_id:   { type: DataTypes.BIGINT, allowNull: false },
    plan_id:   { type: DataTypes.BIGINT, allowNull: false },
    status_id: { type: DataTypes.SMALLINT,        allowNull: false },

    starts_at:       { type: DataTypes.DATE,        allowNull: false },
    ends_at:         { type: DataTypes.DATE,        allowNull: true  },
    renews_at:       { type: DataTypes.DATE,        allowNull: true  },
    cancelled_at:    { type: DataTypes.DATE,        allowNull: true  },
    trial_ends_at:   { type: DataTypes.DATE,        allowNull: true  },

    payment_provider: { type: DataTypes.STRING(40),  allowNull: true },
    external_sub_id:  { type: DataTypes.STRING(120), allowNull: true },
  },
  {
    sequelize,
    modelName:  'Subscription',
    tableName:  'subscriptions',
    timestamps: true,
    createdAt:  'created_at',
    updatedAt:  'updated_at',
  }
);

module.exports = Subscription;
// src/models/medical-document.model.js — versión actualizada
const { DataTypes, Model } = require('sequelize');
const { sequelize }        = require('../config/db');

class MedicalDocument extends Model {
  static associate(db) {
    MedicalDocument.belongsTo(db.Pet,           { foreignKey: 'pet_id',    as: 'pet'    });
    MedicalDocument.belongsTo(db.MedicalRecord, { foreignKey: 'record_id', as: 'record' });
    MedicalDocument.belongsTo(db.User,          { foreignKey: 'uploaded_by', as: 'uploader' });
  }

  // Helper: tamaño legible
  get fileSizeLabel() {
    if (!this.file_size_kb) return '';
    if (this.file_size_kb < 1024) return `${this.file_size_kb} KB`;
    return `${(this.file_size_kb / 1024).toFixed(1)} MB`;
  }

  get isImage() { return this.mime_type?.startsWith('image/'); }
  get isPDF()   { return this.mime_type === 'application/pdf'; }
}

MedicalDocument.init(
  {
    id:            { type: DataTypes.BIGINT,      primaryKey: true, autoIncrement: true },
    pet_id:        { type: DataTypes.BIGINT,      allowNull: false },
    record_id:     { type: DataTypes.BIGINT,      allowNull: true  },
    document_type: { type: DataTypes.STRING(60),  allowNull: false },
    title:         { type: DataTypes.STRING(200), allowNull: false },
    file_url:      { type: DataTypes.TEXT,        allowNull: false },
    file_size_kb:  { type: DataTypes.INTEGER,     allowNull: true  },
    uploaded_at:   { type: DataTypes.DATE,        allowNull: false, defaultValue: DataTypes.NOW },
    uploaded_by:   { type: DataTypes.BIGINT,      allowNull: true  },
    // ── Columnas nuevas (ALTER TABLE) ──────────────────────
    document_date: { type: DataTypes.DATEONLY,    allowNull: true  },
    mime_type:     { type: DataTypes.STRING(100), allowNull: true  },
    file_name:     { type: DataTypes.STRING(255), allowNull: true  },
    notes:         { type: DataTypes.TEXT,        allowNull: true  },
  },
  {
    sequelize,
    modelName:  'MedicalDocument',
    tableName:  'medical_documents',
    timestamps: false,
  }
);

module.exports = MedicalDocument;
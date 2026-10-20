// Sequelize repository. Same interface as repositories/memory.js.
// The database is chosen by DATABASE_URL (default: SQLite file); no SQLite-specific code below.
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { DataTypes, Op, Sequelize, Transaction, UniqueConstraintError } from 'sequelize';
import { AppError } from '../errors.js';

export const DEFAULT_DATABASE_URL = 'sqlite:data/kaskelen.db';

function defineModels(sequelize) {
  // Fresh objects each time: Sequelize mutates attribute definitions.
  const int = () => ({ type: DataTypes.INTEGER, allowNull: false });
  const ms = () => ({ type: DataTypes.BIGINT, allowNull: false }); // UTC milliseconds
  const opts = { timestamps: false };

  const User = sequelize.define(
    'User',
    {
      phone: { type: DataTypes.STRING(16), allowNull: false, unique: true },
      name: { type: DataTypes.STRING(60), allowNull: true },
      role: { type: DataTypes.ENUM('player', 'owner', 'admin'), allowNull: false, defaultValue: 'player' },
      lang: { type: DataTypes.ENUM('kk', 'ru'), allowNull: false, defaultValue: 'kk' },
      createdAt: ms(),
    },
    { ...opts, tableName: 'users' },
  );

  const LoginCode = sequelize.define(
    'LoginCode',
    {
      phone: { type: DataTypes.STRING(16), primaryKey: true },
      codeHash: { type: DataTypes.STRING(64), allowNull: false },
      expiresAt: ms(),
      createdAt: ms(),
      attempts: { ...int(), defaultValue: 0 },
    },
    { ...opts, tableName: 'login_codes' },
  );

  const Session = sequelize.define(
    'Session',
    { token: { type: DataTypes.STRING(64), primaryKey: true }, expiresAt: ms() },
    { ...opts, tableName: 'sessions' },
  );

  const Venue = sequelize.define(
    'Venue',
    {
      category: { type: DataTypes.STRING(20), allowNull: false },
      name: { type: DataTypes.STRING(120), allowNull: false },
      address: { type: DataTypes.STRING(200), allowNull: false },
      description: { type: DataTypes.TEXT, allowNull: true },
      openHour: { ...int(), validate: { min: 0, max: 23 } },
      closeHour: { ...int(), validate: { min: 1, max: 24 } },
      dayPrice: { ...int(), validate: { min: 0 } },
      eveningPrice: { ...int(), validate: { min: 0 } },
      eveningStartHour: { ...int(), validate: { min: 0, max: 24 } },
    },
    {
      ...opts,
      tableName: 'venues',
      validate: {
        openBeforeClose() {
          if (this.openHour >= this.closeHour) throw new Error('openHour must be before closeHour');
        },
      },
    },
  );

  const Resource = sequelize.define(
    'Resource',
    {
      name: { type: DataTypes.STRING(120), allowNull: false },
      capacity: { ...int(), defaultValue: 1, validate: { min: 1 } },
    },
    { ...opts, tableName: 'resources' },
  );

  const Booking = sequelize.define(
    'Booking',
    {
      startAt: ms(),
      price: { ...int(), validate: { min: 0 } },
      status: { type: DataTypes.ENUM('pending', 'confirmed', 'cancelled'), allowNull: false, defaultValue: 'pending' },
      createdAt: ms(),
    },
    {
      ...opts,
      tableName: 'bookings',
      indexes: [
        { fields: ['resourceId', 'startAt'] },
        { fields: ['userId', 'startAt'] },
        // One active place per person per slot, enforced by the database.
        { unique: true, fields: ['resourceId', 'startAt', 'userId'], where: { status: { [Op.ne]: 'cancelled' } }, name: 'bookings_one_per_user_slot' },
      ],
    },
  );

  const Block = sequelize.define(
    'Block',
    { startAt: ms(), reason: { type: DataTypes.STRING(200), allowNull: true } },
    { ...opts, tableName: 'blocks', indexes: [{ unique: true, fields: ['resourceId', 'startAt'] }] },
  );

  const fk = (name) => ({ foreignKey: { name, allowNull: false }, onDelete: 'CASCADE' });
  Session.belongsTo(User, fk('userId'));
  Venue.belongsTo(User, { as: 'owner', foreignKey: { name: 'ownerId', allowNull: true } });
  Resource.belongsTo(Venue, fk('venueId'));
  Venue.hasMany(Resource, fk('venueId'));
  Booking.belongsTo(Resource, fk('resourceId'));
  Booking.belongsTo(User, fk('userId'));
  Booking.belongsTo(User, { as: 'canceller', foreignKey: { name: 'cancelledBy', allowNull: true } });
  Block.belongsTo(Resource, fk('resourceId'));

  return { User, LoginCode, Session, Venue, Resource, Booking, Block };
}

const plain = (row) => (row ? row.get({ plain: true }) : null);
const num = (row) => {
  if (!row) return null;
  // BIGINT columns come back as strings on some dialects; keep numbers everywhere.
  for (const key of ['startAt', 'createdAt', 'expiresAt']) if (row[key] != null) row[key] = Number(row[key]);
  return row;
};
const out = (row) => num(plain(row));

export async function createSqlRepository(url = process.env.DATABASE_URL || DEFAULT_DATABASE_URL) {
  const storage = url.startsWith('sqlite:') ? url.slice('sqlite:'.length) : null;
  if (storage && storage !== ':memory:' && !storage.startsWith('/')) mkdirSync(dirname(storage), { recursive: true });
  const sequelize = storage
    ? new Sequelize({ dialect: 'sqlite', storage, logging: false, ...(storage === ':memory:' ? { pool: { max: 1 } } : {}) })
    : new Sequelize(url, { logging: false });
  if (sequelize.getDialect() === 'sqlite') await sequelize.query('PRAGMA foreign_keys = ON;');
  const m = defineModels(sequelize);
  await sequelize.sync();

  const activeWhere = { status: { [Op.ne]: 'cancelled' } };

  return {
    kind: `sql:${sequelize.getDialect()}`,
    sequelize,
    async close() {
      await sequelize.close();
    },

    async findUserByPhone(phone) {
      return out(await m.User.findOne({ where: { phone } }));
    },
    async findUserById(id) {
      return out(await m.User.findByPk(id));
    },
    async createUser(user) {
      return out(await m.User.create(user));
    },
    async updateUser(id, patch) {
      await m.User.update(patch, { where: { id } });
      return out(await m.User.findByPk(id));
    },

    async getCode(phone) {
      return out(await m.LoginCode.findByPk(phone));
    },
    async saveCode(code) {
      await m.LoginCode.upsert(code);
    },
    async incrementCodeAttempts(phone) {
      await m.LoginCode.increment('attempts', { where: { phone } });
    },
    async deleteCode(phone) {
      await m.LoginCode.destroy({ where: { phone } });
    },

    async createSession(session) {
      await m.Session.create(session);
    },
    async findSessionUser(token, now) {
      const s = await m.Session.findOne({ where: { token, expiresAt: { [Op.gt]: now } }, include: m.User });
      return s ? out(s.User) : null;
    },
    async deleteSession(token) {
      await m.Session.destroy({ where: { token } });
    },

    async countVenues() {
      return m.Venue.count();
    },
    async listVenues() {
      const venues = await m.Venue.findAll({ include: { model: m.Resource, attributes: ['id'] } });
      return venues.map((v) => {
        const { Resources, ...rest } = plain(v);
        return { ...rest, resourceCount: Resources.length };
      });
    },
    async getVenue(id) {
      return out(await m.Venue.findByPk(id));
    },
    async createVenue(venue) {
      return out(await m.Venue.create(venue));
    },
    async updateVenue(id, patch) {
      const venue = await m.Venue.findByPk(id);
      await venue.update(patch);
      return out(venue);
    },
    async createResource(resource) {
      return out(await m.Resource.create(resource));
    },
    async listResources(venueId) {
      return (await m.Resource.findAll({ where: { venueId }, order: [['id', 'ASC']] })).map(out);
    },
    async getResource(id) {
      return out(await m.Resource.findByPk(id));
    },

    /** Count and insert in one IMMEDIATE transaction, so two requests cannot both take the last place. */
    async insertBookingWithinCapacity(booking, capacity) {
      try {
        return await sequelize.transaction({ type: Transaction.TYPES.IMMEDIATE }, async (transaction) => {
          const inSlot = await m.Booking.findAll({
            where: { resourceId: booking.resourceId, startAt: booking.startAt, ...activeWhere },
            transaction,
          });
          if (inSlot.some((b) => b.userId === booking.userId)) throw new AppError('already_booked', 409);
          if (inSlot.length >= capacity) throw new AppError('taken', 409);
          return out(await m.Booking.create(booking, { transaction }));
        });
      } catch (err) {
        if (err instanceof UniqueConstraintError) throw new AppError('already_booked', 409);
        throw err;
      }
    },
    async getBooking(id) {
      return out(await m.Booking.findByPk(id));
    },
    async updateBooking(id, patch) {
      await m.Booking.update(patch, { where: { id } });
      return out(await m.Booking.findByPk(id));
    },
    async listActiveBookings(resourceId, from, to) {
      return (
        await m.Booking.findAll({
          where: { resourceId, startAt: { [Op.gte]: from, [Op.lt]: to }, ...activeWhere },
          order: [['createdAt', 'ASC'], ['id', 'ASC']],
        })
      ).map(out);
    },
    async hasActiveBooking(resourceId, startAt) {
      return (await m.Booking.count({ where: { resourceId, startAt, ...activeWhere } })) > 0;
    },
    async listBookingsByUser(userId) {
      return (await m.Booking.findAll({ where: { userId }, order: [['startAt', 'DESC']] })).map(out);
    },

    async listBlocks(resourceId, from, to) {
      return (await m.Block.findAll({ where: { resourceId, startAt: { [Op.gte]: from, [Op.lt]: to } } })).map(out);
    },
    async findBlock(resourceId, startAt) {
      return out(await m.Block.findOne({ where: { resourceId, startAt } }));
    },
    async createBlock(block) {
      try {
        return out(await m.Block.create(block));
      } catch (err) {
        if (err instanceof UniqueConstraintError) throw new AppError('blocked_slot', 409);
        throw err;
      }
    },
    async getBlock(id) {
      return out(await m.Block.findByPk(id));
    },
    async deleteBlock(id) {
      await m.Block.destroy({ where: { id } });
    },
  };
}

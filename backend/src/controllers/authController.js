import bcrypt from 'bcryptjs';
import { User } from '../models/User.js';
import { ApiError } from '../utils/ApiError.js';
import { ok, created } from '../utils/http.js';
import { setAuthCookie, clearAuthCookie } from '../middleware/auth.js';

const BCRYPT_ROUNDS = 12;

// Compared against when the email is unknown so response time does not reveal which emails exist.
const DUMMY_HASH = bcrypt.hashSync('campuscare-dummy-password', 10);

const publicUser = (u) => u.toJSON();

/** Public registration ALWAYS creates a student; the role is never read from the request. */
export async function register(req, res) {
  const { name, email, password, registrationNumber, phone } = req.valid.body;

  if (await User.exists({ email })) throw ApiError.conflict('An account with this email already exists');
  if (registrationNumber && (await User.exists({ registrationNumber }))) {
    throw ApiError.conflict('This registration number is already registered');
  }

  const user = await User.create({
    name,
    email,
    passwordHash: await bcrypt.hash(password, BCRYPT_ROUNDS),
    role: 'student',
    registrationNumber,
    phone,
  });

  setAuthCookie(res, user._id);
  return created(res, { user: publicUser(user) }, 'Registration successful');
}

export async function login(req, res) {
  const { email, password } = req.valid.body;
  const user = await User.findOne({ email }).select('+passwordHash');

  const valid = await bcrypt.compare(password, user?.passwordHash ?? DUMMY_HASH);
  if (!user || !valid) throw ApiError.unauthorized('Invalid email or password');
  if (!user.isActive) throw ApiError.forbidden('This account has been disabled. Contact the administrator.');

  setAuthCookie(res, user._id);
  await user.populate('department', 'name');
  return ok(res, { user: publicUser(user) }, 'Login successful');
}

export async function logout(_req, res) {
  clearAuthCookie(res);
  return ok(res, null, 'Logged out');
}

export async function me(req, res) {
  await req.user.populate('department', 'name');
  return ok(res, { user: publicUser(req.user) });
}

export async function updateProfile(req, res) {
  const { name, phone, currentPassword, newPassword } = req.valid.body;
  const user = await User.findById(req.user._id).select('+passwordHash');

  if (newPassword) {
    const match = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!match) throw ApiError.badRequest('Current password is incorrect');
    user.passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
  }
  if (name !== undefined) user.name = name;
  if (phone !== undefined) user.phone = phone;
  await user.save();
  await user.populate('department', 'name');
  return ok(res, { user: publicUser(user) }, 'Profile updated');
}

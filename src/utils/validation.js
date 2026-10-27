// Philippine mobile numbers: 09XXXXXXXXX or +639XXXXXXXXX.
export const isValidPhone = (value = '') => /^(09\d{9}|\+639\d{9})$/.test(value.replace(/[\s-]/g, ''));
export const isValidEmail = (value = '') => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
export const isValidIdentifier = (v) => isValidPhone(v) || isValidEmail(v);
export const isStrongPassword = (v = '') => v.length >= 8;

export const validateSignUp = ({ fullName, phone, email, password, confirm, agreed }) => {
  const errors = {};
  if (fullName.trim().length < 2) errors.fullName = 'Please enter your full name.';
  if (!isValidPhone(phone)) errors.phone = 'Use a valid PH number, e.g. 09XX XXX XXXX.';
  if (!isValidEmail(email)) errors.email = 'Enter a valid email address.';
  if (!isStrongPassword(password)) errors.password = 'Password must be at least 8 characters.';
  if (confirm !== password) errors.confirm = 'Passwords do not match.';
  if (!agreed) errors.agreed = 'Please accept the Terms of Service and Privacy Policy.';
  return errors;
};

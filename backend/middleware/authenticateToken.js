const jwt = require('jsonwebtoken');

const authenticateToken = (req, res, next) => {
  console.log('Authenticating request for path:', req.path);
  console.log('Headers:', JSON.stringify(req.headers, null, 2));
  
  const authHeader = req.headers['authorization'];
  console.log('Authorization header:', authHeader);
  
  const token = authHeader && authHeader.split(' ')[1];
  console.log('Extracted token:', token ? token.substring(0, 10) + '...' : 'none');

  if (!token) {
    console.log('No token provided');
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    if (!process.env.JWT_SECRET) {
      console.error('JWT_SECRET is not defined!');
      return res.status(500).json({ error: 'Server configuration error' });
    }
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log('Token verified successfully:', {
      userId: decoded.userId,
      exp: new Date(decoded.exp * 1000).toISOString()
    });
    req.user = decoded;
    next();
  } catch (error) {
    console.error('Token verification failed:', {
      error: error.message,
      name: error.name,
      stack: error.stack
    });
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired' });
    }
    return res.status(401).json({ error: 'Invalid token' });
  }
};

module.exports = authenticateToken;
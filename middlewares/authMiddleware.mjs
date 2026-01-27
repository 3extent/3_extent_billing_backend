import jwt from "jsonwebtoken";

export const verifyToken = (req, res, next) => {
  try {
    // 1️⃣ Get token from header
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({ message: "Access denied. Token missing." });
    }

    // Expected format: "Bearer <token>"
    const token = authHeader.split(" ")[1];

    if (!token) {
      return res.status(401).json({ message: "Access denied. Invalid token format." });
    }

    // 2️⃣ Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // 3️⃣ Attach decoded data to request
    req.user = decoded;

    // 4️⃣ Continue to controller
    next();

  } catch (error) {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
};

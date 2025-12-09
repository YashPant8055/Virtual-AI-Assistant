// import genToken from "../Config/token.js";
// import User from "../Models/user.model.js";
// import bcrypt from "bcryptjs";

// export const signUp = async (req, res) => {
//   try {
//     const { name, email, password } = req.body;
//     const existEmail = await User.findOne({ email });
//     if (existEmail) {
//       return res.status(400).json({ message: "email already exists!" });
//     }
//     if (password.length < 6) {
//       return res
//         .status(400)
//         .json({ message: "password must contain at least 6 characters!" });
//     }
//     const hashedPassword = await bcrypt.hash(password, 10);
//     const user = await User.create({
//       name,
//       password: hashedPassword,
//       email,
//     });
//     const token = await genToken(user._id);
//     res.cookie("token", token, {
//       httpOnly: true,
//       maxAge: 15 * 24 * 60 * 60 * 1000,
//       sameSite: "strict",
//       secure: false,
//     });
//     return res.status(201).json(user);
//   } catch (error) {
//     return res.status(500).json({ message: `sign up error $error` });
//   }
// };

// export const login = async (req, res) => {
//   try {
//     const { email, password } = req.body;
//     const user = await User.findOne({ email });
//     if (!user) {
//       return res.status(400).json({ message: "email does not exists!" });
//     }
//     const isMatch = await bcrypt.compare(password, user.password);
//     if (!isMatch) {
//       return res.status(400).json({ message: "Incorrect Password!" });
//     }

//     const token = await genToken(user._id);
//     res.cookie("token", token, {
//       httpOnly: true,
//       maxAge: 15 * 24 * 60 * 60 * 1000,
//       sameSite: "strict",
//       secure: false,
//     });
//     return res.status(200).json(user);
//   } catch (error) {
//     return res.status(500).json({ message: `Login error ${error}` });
//   }
// };

// export const logOut = async (req, res) => {
//   try {
//     res.clearCookie("token");
//     return res.status(200).json({ message: "log out successfully" });
//   } catch (error) {
//     return res.status(500).json({ message: `logout error ${error}` });
//   }
// };








import genToken from "../Config/token.js";
import User from "../Models/user.model.js";
import bcrypt from "bcryptjs";

export const signUp = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    const existEmail = await User.findOne({ email });
    if (existEmail) {
      return res.status(400).json({ message: "email already exists!" });
    }

    if (password.length < 6) {
      return res
        .status(400)
        .json({ message: "password must contain at least 6 characters!" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      name,
      password: hashedPassword,
      email,
    });

    const token = await genToken(user._id);

    res.cookie("token", token, {
      httpOnly: true,
      maxAge: 15 * 24 * 60 * 60 * 1000,
      sameSite: "None",
      secure: true, // keep as-is for localhost
    });

    // ✅ Do NOT return password
    const safeUser = {
      _id: user._id,
      name: user.name,
      email: user.email,
    };

    return res.status(201).json(safeUser);
  } catch (error) {
    return res.status(500).json({ message: `sign up error ${error.message}` });
  }
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: "email does not exists!" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Incorrect Password!" });
    }

    const token = await genToken(user._id);

    res.cookie("token", token, {
      httpOnly: true,
      maxAge: 15 * 24 * 60 * 60 * 1000,
      sameSite: "None",
      secure: true, // keep as-is for localhost
    });

    // ✅ Do NOT return password
    const safeUser = {
      _id: user._id,
      name: user.name,
      email: user.email,
    };

    return res.status(200).json(safeUser);
  } catch (error) {
    return res.status(500).json({ message: `Login error ${error.message}` });
  }
};

export const logOut = async (req, res) => {
  try {
    res.clearCookie("token");
    return res.status(200).json({ message: "log out successfully" });
  } catch (error) {
    return res.status(500).json({ message: `logout error ${error.message}` });
  }
};

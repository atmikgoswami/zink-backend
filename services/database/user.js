function UserDatabase(dbConnectionString) {
  const logger = require("../log");
  const mongoose = require("mongoose");
  const connectionString = dbConnectionString;
  const User = require("../../models/user");

  this.connect = () => {
    mongoose.connection.on("error", function (err) {
      logger.error("Database connection error: " + err);
    });

    mongoose.connection.on("disconnected", function () {
      logger.info("Database disconnected");
    });

    process.on("SIGINT", async function () {
      try {
        await mongoose.connection.close();
        logger.info("Database process terminated");
        process.exit(0);
      } catch (err) {
        logger.error("Error closing database connection: " + err);
        process.exit(1);
      }
    });

    if (!connectionString) {
      throw new Error(
        "Impossible to connect to MongoDB database: connection string not stabilished"
      );
    }

    return mongoose.connect(connectionString);
  };

  this.close = () => {
    return mongoose.connection.close();
  };

  this.createUser = async (user) => {
    if (!user || !user.email || !user.phone || !user.fullname) {
      throw new Error("User object must include email and phone");
    }

    try {
      const newUser = new User({
        ...user, // spreads all fields: email, phone, fullname, picture, etc.
      });

      let savedUser = await newUser.save();
      savedUser = savedUser.toObject();


      return savedUser;
    } catch (error) {
      console.error("Error creating user:", error);
      throw error;
    }
  };

  this.deleteUserById = (id) => {
    if (!id) {
      throw "id cannot be null or undefined";
    }

    return User.findByIdAndDelete(id).then((deletedUser) => {
      if (!deletedUser) {
        throw "User not found";
      }
      return deletedUser;
    });
  };

  this.getUserById = (id) => {
    if (!id) {
      throw "id cannot be null or undefined";
    }

    return User.findById(id).then((user) => {
      return user;
    });
  };

  this.getUserByEmail = (email, requirePassword = false) => {
    if (requirePassword) {
      return User.findOne({ email: email }).then((user) => {
        return user;
      });
    } else {
      return User.findOne({ email: email }).then((user) => {
        return user;
      });
    }
  };

  this.getUsers = () => {
    return User.find({}).then((users) => {
      return users;
    });
  };
}

module.exports = UserDatabase;

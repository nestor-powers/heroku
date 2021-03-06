//var require('dotenv').load();
var path = require("path");
var chai = require("chai");
var nock = require("nock");
var _ref = require('nestorbot');
var Robot = _ref.Robot;
var TextMessage = _ref.TextMessage;
var User = _ref.User;

process.env.HUBOT_HEROKU_API_KEY = 'fake_key';

var expect = chai.expect;

describe("Heroku Commands", function() {
  var robot, user;
  var mockHeroku = nock("https://api.heroku.com");

  beforeEach(function() {
    robot = new Robot('TDEADBEEF', 'UNESTORBOT1', false);
    robot.debugMode = true;
    user = new User('1', {
      name: 'nestorbottester',
      room: 'CDEADBEEF1'
    });

    require(__dirname + "/../index.js")(robot);
  });

  afterEach(function() {
    nock.cleanAll();
  });

  var messageToNestor = function(command) {
    return "<@" + robot.botId + ">: " + command;
  }

  describe("heroku list apps <app name>", function() {
    beforeEach(function() {
      mockHeroku.get("/apps").replyWithFile(200, __dirname + "/fixtures/app-list.json");
    });

    describe("when given an argument <app name>", function() {
      it("returns a list of the apps filtered by <app name>", function(done) {
        robot.receive(new TextMessage(user, messageToNestor("heroku list apps staging")), function() {
          expect(robot.toSend[0].strings[0]).to.eql("Listing apps matching: staging");
          expect(robot.toSend[0].reply).to.be.true;
          expect(robot.toSend[1].strings[0]).to.not.contain(/shield-global-watch\b/);
          expect(robot.toSend[1].strings[0]).to.contain("shield-global-watch-staging");
          expect(robot.toSend[1].reply).to.be.true;
          done();
        });
      });
    });

    describe("when the command is called without arguments", function() {
      it("returns a list of all apps", function(done) {
        robot.receive(new TextMessage(user, messageToNestor("heroku list apps")), function() {
          expect(robot.toSend[0].strings[0]).to.eql("Listing all apps available...");
          expect(robot.toSend[0].reply).to.be.true;
          expect(robot.toSend[1].strings[0]).to.match(/shield-global-watch\b/);
          expect(robot.toSend[1].strings[0]).to.contain("shield-global-watch-staging");
          expect(robot.toSend[1].reply).to.be.true;
          done();
        });
      });
    });
  });

  describe("heroku info <app>", function() {
    it("gets information about the app's dynos", function(done) {
      mockHeroku.get("/apps/shield-global-watch").replyWithFile(200, __dirname + "/fixtures/app-info.json");

      robot.receive(new TextMessage(user, messageToNestor("heroku info shield-global-watch")), function() {
        expect(robot.toSend[0].strings[0]).to.eql("Getting information about shield-global-watch");
        expect(robot.toSend[0].reply).to.be.true;
        expect(robot.toSend[1].strings[0]).to.contain("last_release : 2014-12-12T02:16:59Z");
        expect(robot.toSend[1].reply).to.be.true;
        done();
      });
    });
  });

  describe("heroku dynos <app>", function() {
    it("lists all dynos and their status", function(done) {
      mockHeroku.get("/apps/shield-global-watch/dynos").replyWithFile(200, __dirname + "/fixtures/dynos.json");

      robot.receive(new TextMessage(user, messageToNestor("heroku dynos shield-global-watch")), function() {
        expect(robot.toSend[0].strings[0]).to.eql("Getting dynos of shield-global-watch");
        expect(robot.toSend[0].reply).to.be.true;
        expect(robot.toSend[1].strings[0]).to.contain("Dynos of shield-global-watch\n=== web (1X): `forever server.js`\nweb.1: up 2015/01/01 12:00:00");
        expect(robot.toSend[1].strings[0]).to.include("\nweb.2: crashed 2015/01/01 12:00:00");
        expect(robot.toSend[1].strings[0]).to.include("\n\n=== worker (2X): `celery worker`\nworker.1: up 2015/06/01 12:00:00");
        expect(robot.toSend[1].reply).to.be.true;
        done();
      });
    });
  });

  describe("heroku releases <app>", function() {
    it("gets the 10 recent releases", function(done) {
      mockHeroku.get("/apps/shield-global-watch/releases").replyWithFile(200, __dirname + "/fixtures/releases.json");

      robot.receive(new TextMessage(user, messageToNestor("heroku releases shield-global-watch")), function() {
        expect(robot.toSend[0].strings[0]).to.eql("Getting releases for shield-global-watch");
        expect(robot.toSend[0].reply).to.be.true;
        expect(robot.toSend[1].strings[0]).to.include("Recent releases of shield-global-watch\nv352 - Promote shield-global-watch v287 fb2b5ff - phil@shield.com");
        expect(robot.toSend[1].reply).to.be.true;
        done();
      });
    });
  });

  describe("heroku rollback <app> <version>", function() {
    beforeEach(function() {
      mockHeroku.get("/apps/shield-global-watch/releases").replyWithFile(200, __dirname + "/fixtures/releases.json");
      mockHeroku.post('/apps/shield-global-watch/releases').replyWithFile(200, __dirname + "/fixtures/rollback.json");
    });

    it("rolls back the app to the specified version", function(done) {
      robot.receive(new TextMessage(user, messageToNestor("heroku rollback shield-global-watch v352")), function() {
        expect(robot.toSend[0].strings[0]).to.eql("Telling Heroku to rollback to v352");
        expect(robot.toSend[0].reply).to.be.true;
        expect(robot.toSend[1].strings[0]).to.include("Success! v353 -> Rollback to v352");
        expect(robot.toSend[1].reply).to.be.true;
        done();
      });
    });

    it("tells the user about a bad supplied version", function(done) {
      robot.receive(new TextMessage(user, messageToNestor("heroku rollback shield-global-watch v999")), function() {
        expect(robot.toSend[0].strings[0]).to.eql("Telling Heroku to rollback to v999");
        expect(robot.toSend[0].reply).to.be.true;
        expect(robot.toSend[1].strings[0]).to.include("Version v999 not found for shield-global-watch :(");
        expect(robot.toSend[1].reply).to.be.true;
        done();
      });
    });
  });

  describe("heroku restart <app> <dyno>", function() {
    it("restarts the app", function(done) {
      mockHeroku["delete"]("/apps/shield-global-watch/dynos").reply(200, {});
      robot.receive(new TextMessage(user, messageToNestor("heroku restart shield-global-watch")), function() {
        expect(robot.toSend[0].strings[0]).to.eql("Telling Heroku to restart shield-global-watch");
        expect(robot.toSend[0].reply).to.be.true;
        expect(robot.toSend[1].strings[0]).to.eql("Heroku: Restarting shield-global-watch");
        expect(robot.toSend[1].reply).to.be.true;
        done();
      });
    });

    it("restarts all dynos of a process", function(done) {
      mockHeroku["delete"]("/apps/shield-global-watch/dynos/web").reply(200, {});
      robot.receive(new TextMessage(user, messageToNestor("heroku restart shield-global-watch web")), function() {
        expect(robot.toSend[0].strings[0]).to.eql("Telling Heroku to restart shield-global-watch web");
        expect(robot.toSend[0].reply).to.be.true;
        expect(robot.toSend[1].strings[0]).to.eql("Heroku: Restarting shield-global-watch web");
        expect(robot.toSend[1].reply).to.be.true;
        done();
      });
    });

    it("restarts specific dynos", function(done) {
      mockHeroku["delete"]("/apps/shield-global-watch/dynos/web.1").reply(200, {});

      robot.receive(new TextMessage(user, messageToNestor("heroku restart shield-global-watch web.1")), function() {
        expect(robot.toSend[0].strings[0]).to.eql("Telling Heroku to restart shield-global-watch web.1");
        expect(robot.toSend[0].reply).to.be.true;
        expect(robot.toSend[1].strings[0]).to.eql("Heroku: Restarting shield-global-watch web.1");
        expect(robot.toSend[1].reply).to.be.true;
        done();
      });
    });
  });

  describe("heroku migrate <app>", function() {
    beforeEach(function() {
      mockHeroku.post("/apps/shield-global-watch/dynos", {
        command: "rake db:migrate",
        attach: false
      }).replyWithFile(200, __dirname + "/fixtures/migrate.json");

      mockHeroku.post("/apps/shield-global-watch/log-sessions", {
        dyno: "run.6454",
        tail: true
      }).replyWithFile(200, __dirname + "/fixtures/log-session.json");
    });

    it("runs migrations", function(done) {
      robot.receive(new TextMessage(user, messageToNestor("heroku migrate shield-global-watch")), function() {
        expect(robot.toSend[0].strings[0]).to.eql("Telling Heroku to migrate shield-global-watch");
        expect(robot.toSend[0].reply).to.be.true;
        expect(robot.toSend[1].strings[0]).to.eql("Heroku: Running migrations for shield-global-watch");
        expect(robot.toSend[1].reply).to.be.true;
        done();
      });
    });

    it("returns the logplex_url", function(done) {
      robot.receive(new TextMessage(user, messageToNestor("heroku migrate shield-global-watch")), function() {
        expect(robot.toSend[2].strings[0]).to.eql("View logs at: https://logplex.heroku.com/sessions/9d4f18cd-d9k8-39a5-ddef-a47dfa443z74?srv=1418011757");
        expect(robot.toSend[2].reply).to.be.true;
        done();
      });
    });
  });

  describe("heroku config <app>", function() {
    it("gets a list of config keys without values", function(done) {
      mockHeroku.get("/apps/shield-global-watch/config-vars").replyWithFile(200, __dirname + "/fixtures/config.json");

      robot.receive(new TextMessage(user, messageToNestor("heroku config shield-global-watch")), function() {
        expect(robot.toSend[0].strings[0]).to.eql("Getting config keys for shield-global-watch");
        expect(robot.toSend[0].reply).to.be.true;
        expect(robot.toSend[1].strings[0]).to.eql("CLOAK, COMMANDER, AUTOPILOT, PILOT_NAME");
        expect(robot.toSend[1].reply).to.be.true;
        done();
      });
    });
  });

  describe("heroku config:set <app> <KEY=value>", function() {
    var mockRequest = function(keyPair) {
      mockHeroku.patch("/apps/shield-global-watch/config-vars", keyPair).replyWithFile(200, __dirname + "/fixtures/config-set.json");
    };

    it("sets config <KEY=value>", function(done) {
      mockRequest({
        "CLOAK_ID": "example.com"
      });

      robot.receive(new TextMessage(user, messageToNestor("heroku config:set shield-global-watch CLOAK_ID=example.com")), function() {
        expect(robot.toSend[0].strings[0]).to.eql("Setting config CLOAK_ID => example.com");
        expect(robot.toSend[0].reply).to.be.true;
        expect(robot.toSend[1].strings[0]).to.eql("Heroku: CLOAK_ID is set to example.com");
        expect(robot.toSend[1].reply).to.be.true;
        done();
      });
    });

    it("handles UUIDs", function(done) {
      mockRequest({
        "UUID": "d5126f0d-b3be-46af-883f-b330a73964f9"
      });

      robot.receive(new TextMessage(user, messageToNestor("heroku config:set shield-global-watch UUID=d5126f0d-b3be-46af-883f-b330a73964f9")), function() {
        expect(robot.toSend[1].strings[0]).to.eql("Heroku: UUID is set to d5126f0d-b3be-46af-883f-b330a73964f9");
        expect(robot.toSend[1].reply).to.be.true;
        done();
      });
    });

    it("handles URLs", function(done) {
      mockRequest({
        "PUSHER_URL": "http://c0d9g8najfcc4634kd3:cf2eeas0d8dghfa847d@api.pusherapp.com/apps/1234"
      });

      robot.receive(new TextMessage(user, messageToNestor("heroku config:set shield-global-watch PUSHER_URL=http://c0d9g8najfcc4634kd3:cf2eeas0d8dghfa847d@api.pusherapp.com/apps/1234")), function() {
        expect(robot.toSend[1].strings[0]).to.eql("Heroku: PUSHER_URL is set to http://c0d9g8najfcc4634kd3:cf2eeas0d8dghfa847d@api.pusherapp.com/apps/1234");
        expect(robot.toSend[1].reply).to.be.true;
        done();
      });
    });

    it("handles comma delimited strings", function(done) {
      mockRequest({
        "COMMA_DELIMITED_STRING": "MiD,DA,MDe"
      });

      robot.receive(new TextMessage(user, messageToNestor("heroku config:set shield-global-watch COMMA_DELIMITED_STRING=MiD,DA,MDe")), function() {
        expect(robot.toSend[1].strings[0]).to.eql("Heroku: COMMA_DELIMITED_STRING is set to MiD,DA,MDe");
        expect(robot.toSend[1].reply).to.be.true;
        done();
      });
    });

    it("handles text strings", function(done) {
      mockRequest({
        "SENTENCE": "Don\'t stop believin."
      });

      robot.receive(new TextMessage(user, messageToNestor("heroku config:set shield-global-watch SENTENCE=\"Don't stop believin.\"")), function() {
        expect(robot.toSend[1].strings[0]).to.eql("Heroku: SENTENCE is set to Don\'t stop believin.");
        expect(robot.toSend[1].reply).to.be.true;
        done();
      });
    });

    it("handles RSA secret keys", function(done) {
      mockRequest({
        "RSA_SECRET_KEY": "----BEGIN RSA PRIVATE KEY-----\nsfsdfdssfdsFDSFDGSDfsdfsfs\nSDfSDFdUbOfFRocKsSFDSFSDFDS=\n-----END RSA PRIVATE KEY-----\n"
      });

      robot.receive(new TextMessage(user, messageToNestor("heroku config:set shield-global-watch RSA_SECRET_KEY=\"----BEGIN RSA PRIVATE KEY-----\nsfsdfdssfdsFDSFDGSDfsdfsfs\nSDfSDFdUbOfFRocKsSFDSFSDFDS=\n-----END RSA PRIVATE KEY-----\n\"")), function() {
        expect(robot.toSend[1].strings[0]).to.eql("Heroku: RSA_SECRET_KEY is set to \"----BEGIN RSA PRIVATE KEY-----\nsfsdfdssfdsFDSFDGSDfsdfsfs\nSDfSDFdUbOfFRocKsSFDSFSDFDS=\n-----END RSA PRIVATE KEY-----\n\"");
        expect(robot.toSend[1].reply).to.be.true;
        done();
      });
    });
  });

  describe("heroku config:unset <KEY>", function() {
    it("unsets config <KEY>", function(done) {
      mockHeroku.patch("/apps/shield-global-watch/config-vars", {
        "CLOAK_ID": null
      }).reply(200, {});

      robot.receive(new TextMessage(user, messageToNestor("heroku config:unset shield-global-watch CLOAK_ID")), function() {
        expect(robot.toSend[0].strings[0]).to.eql("Unsetting config CLOAK_ID");
        expect(robot.toSend[0].reply).to.be.true;
        expect(robot.toSend[1].strings[0]).to.eql("Heroku: CLOAK_ID has been unset");
        expect(robot.toSend[1].reply).to.be.true;
        done();
      });
    });
  });
});

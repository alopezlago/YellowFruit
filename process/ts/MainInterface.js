/***********************************************************
MainInterface.js
Andrew Nadig

Defines the MainInterface compenent that contains the
entire UI of the main window
***********************************************************/
const $ = require('jquery');
const _ = require('lodash');
const M = require('materialize-css');
const Mousetrap = require('mousetrap');

// see https://github.com/electron/electron/issues/9920#issuecomment-606581361
const fs = eval("require('fs')");
const Path = eval("require('path')");
const { ipcRenderer } = eval("require('electron')");
const ipc = ipcRenderer;

const APPDATA_DIR = ipc.sendSync('get-appdata-dir');
const ROOT_DIR = ipc.sendSync('get-root-dir');

const RELEASED_RPT_CONFIG_FILE = Path.resolve(ROOT_DIR, 'data', 'ReleasedRptConfig.json');
const CUSTOM_RPT_CONFIG_FILE_DEV = Path.resolve(ROOT_DIR, 'data', 'CustomRptConfig.json');
const CUSTOM_RPT_CONFIG_FILE_PROD = Path.resolve(APPDATA_DIR, 'YellowFruit', 'CustomRptConfig.json');
const DEF_STANDINGS_FILE = Path.resolve(ROOT_DIR, 'app', 'standings.html');
const DEF_INDIVIDUALS_FILE = Path.resolve(ROOT_DIR, 'app', 'individuals.html');
const DEF_SCOREBOARD_FILE = Path.resolve(ROOT_DIR, 'app', 'games.html');
const DEF_TEAMDETAIL_FILE = Path.resolve(ROOT_DIR, 'app', 'teamdetail.html');
const DEF_PLAYERDETAIL_FILE = Path.resolve(ROOT_DIR, 'app', 'playerdetail.html');
const DEF_ROUNDREPORT_FILE = Path.resolve(ROOT_DIR, 'app', 'rounds.html');

import * as React from "react";
import * as SqbsUtils from './SqbsUtils';
const StatUtils = require('./StatUtils');
import * as StatUtils2 from './StatUtils2';
import * as Neg5Import from './Neg5Import';
import * as QbjExport from './QbjExport';
import * as SingleGameQBJImport from './SingleGameQBJImport';
import * as GameVal from './GameVal';
// Bring in all the other React components
import { TeamListEntry } from './TeamListEntry';
import { GameListEntry } from './GameListEntry';
import { HeaderNav } from './HeaderNav';
import { AddTeamModal } from './AddTeamModal';
import { AddGameModal } from './AddGameModal';
import { DivisionEditModal } from './DivisionEditModal';
import { RptConfigModal } from './RptConfigModal';
import { DivAssignModal } from './DivAssignModal';
import { PhaseAssignModal } from './PhaseAssignModal';
const SettingsForm = require('./SettingsForm');
import { TeamList } from './TeamList';
import { GameList} from './GameList';
import { StatSidebar } from './StatSidebar';
import { ImportSidebar } from './ImportSidebar';
import { SidebarToggleButton } from './SidebarToggleButton';

const MAX_PLAYERS_PER_TEAM = 50;
var appVersion = ipc.sendSync('get-app-version');
const METADATA = { version: appVersion }; // take version straight from package.json
const DEFAULT_SETTINGS = {
  powers: '15pts',
  negs: true,
  bonuses: true,
  bonusesBounce: false,
  lightning: false,
  playersPerTeam: 4,
  defaultPhases: [], // Used to group teams when viewing all games
  rptConfig: 'YF Defaults'
};
//Materialize accent-1 colors: yellow, light-green, orange, light-blue, red, purple, teal, deep-purple, pink, green
const PHASE_COLORS = ['#ffff8d', '#ccff90', '#ffd180', '#80d8ff',
  '#ff8a80', '#ea80fc', '#a7ffeb', '#b388ff', '#ff80ab', '#b9fc6a'];
const EMPTY_CUSTOM_RPT_CONFIG = {
    defaultRpt: null,
    rptConfigList: {}
}
const SYS_DEFAULT_RPT_NAME = 'YF Defaults';
const MAX_CUSTOM_RPT_CONFIGS = 25;
const DEFAULT_FORM_SETTINGS = {
  showYearField: true,
  showSmallSchool: true,
  showJrVarsity: true,
  showUGFields: true,
  showD2Fields: true
};


export class MainInterface extends React.Component {

  constructor(props) {
    super(props);

    var defSettingsCopy = $.extend(true, {}, DEFAULT_SETTINGS);
    var defFormSettingsCopy = $.extend(true, {}, DEFAULT_FORM_SETTINGS);

    var loadRpts = fs.readFileSync(RELEASED_RPT_CONFIG_FILE, 'utf8');
    var releasedRptList = JSON.parse(loadRpts).rptConfigList;

    this.state = {
      tmWindowVisible: false, // whether the team entry modal is open
      gmWindowVisible: false, // whether the game entry modal is open
      divEditWindowVisible: false, // whether the division edit modal is open
      rptConfigWindowVisible: false, // whether the report configuration modal is open
      divWindowVisible: false, // whether the team division assignment modal is open
      phaseWindowVisible: false, // whether the game phase assignment modal is open
      teamOrder: 'alpha', // sort order. Either 'alpha' or 'division'
      queryText: '', // what's in the search bar
      settings: defSettingsCopy, // object to define the tournament rules
      packets: {}, // packet names
      divisions: {}, // object where the keys are phases, and their values are the list
                     // of divisions in that phase
      allTeams: [], // the list of teams
      allGames: [], // the list of games
      gameIndex: {}, // the list of rounds, and how many games exist for that round
      playerIndex: {}, // the list of teams with their players, and how many games each player has played
      tbCount: 0, // number of tiebreaker games in the current tournament
      allGamesShowTbs: false, // whether to include tiebreakers when showing all games
      selectedTeams: [], // teams with checkbox checked on the teams pane
      selectedGames: [], // games with checkbox checked on the games pane
      checkTeamToggle: false, // used in the key of TeamListEntry components in order to
                              // force their constructor to be called when necessary
      checkGameToggle: false, // see checkTeamToggle
      settingsLoadToggle: false, // used to force the whole settings pane to redraw when
                                 // when divisions or phases are changed
      navbarLoadToggle: false, //used to force the navbar to redraw
      activePane: 'settingsPane',  // settings, teams, or games
      viewingPhase: 'all', // 'all' or the name of a user-defined phase, or 'Tiebreakers'
      editWhichDivision: null, // which division to load in the division edit modal
      divAddOrEdit: 'add', // either 'add' or 'edit'
      editWhichTeam: null,    // which team to load in the team modal
      tmAddOrEdit: 'add', //either 'add' or 'edit'
      editWhichGame: null, // which game to load in the game modal
      gmAddOrEdit: 'add', // either 'add' or 'edit'
      editingSettings: false, // Whether the "settings" section of the settings pane is open for editing
      gameToBeDeleted: null, // which game the user is attempting to delete
      divToBeDeleted: null, // which deivision the user is attempting to delete
      releasedRptList: releasedRptList, // list of uneditable report configurations
      customRptList: {}, // list of user-created report configurations
      customRptFile: null, // file path to score user configuration
      defaultRpt: SYS_DEFAULT_RPT_NAME, // which report configuration is default for new tournaments
      activeRpt: SYS_DEFAULT_RPT_NAME, // which report configuration is currently being used
      formSettings: defFormSettingsCopy, // which optional entry fields to turn on or off
      sidebarOpen: true, // whether the sidebar is visible
      reconstructSidebar: false, // used to force the sidebar to reload when any teams are modified
      defaultRound: 1,  // default round to use when creating a new game
      badgeFilter: null, // 'errors' or 'warnings' -- filter to games with validation issues
      importResult: null // results of the most recent game import. ImportResult type.
    };
    this.openTeamModal = this.openTeamModal.bind(this);
    this.openGameModal = this.openGameModal.bind(this);
    this.openDivEditModal = this.openDivEditModal.bind(this);
    this.onModalClose = this.onModalClose.bind(this);
    this.addTeam = this.addTeam.bind(this);
    this.addGame = this.addGame.bind(this);
    this.modifyTeam = this.modifyTeam.bind(this);
    this.modifyGame = this.modifyGame.bind(this);
    this.deleteTeam = this.deleteTeam.bind(this);
    this.deleteGame = this.deleteGame.bind(this);
    this.validateDivisionName = this.validateDivisionName.bind(this);
    this.validateTeamName = this.validateTeamName.bind(this);
    this.haveTeamsPlayedInRound = this.haveTeamsPlayedInRound.bind(this);
    this.onSelectTeam = this.onSelectTeam.bind(this);
    this.onSelectGame = this.onSelectGame.bind(this);
    this.reOrder = this.reOrder.bind(this);
    this.searchLists = this.searchLists.bind(this);
    this.setPane = this.setPane.bind(this);
    this.setPhase = this.setPhase.bind(this);
    this.addDivision = this.addDivision.bind(this);
    this.modifyDivision = this.modifyDivision.bind(this);
    this.deleteDivision = this.deleteDivision.bind(this);
    this.reorderDivisions = this.reorderDivisions.bind(this);
    this.savePhases = this.savePhases.bind(this);
    this.openDivModal = this.openDivModal.bind(this);
    this.openPhaseModal = this.openPhaseModal.bind(this);
    this.submitDivAssignments = this.submitDivAssignments.bind(this);
    this.submitPhaseAssignments = this.submitPhaseAssignments.bind(this);
    this.removeDivisionFromTeam = this.removeDivisionFromTeam.bind(this);
    this.removePhaseFromGame = this.removePhaseFromGame.bind(this);
    this.setDefaultGrouping = this.setDefaultGrouping.bind(this);
    this.toggleTiebreakers = this.toggleTiebreakers.bind(this);
    this.saveSettings = this.saveSettings.bind(this);
    this.editingSettings = this.editingSettings.bind(this);
    this.teamHasPlayedGames = this.teamHasPlayedGames.bind(this);
    this.savePackets = this.savePackets.bind(this);
    this.sortTeamsBy = this.sortTeamsBy.bind(this);
    this.modifyRptConfig = this.modifyRptConfig.bind(this);
    this.setDefaultRpt = this.setDefaultRpt.bind(this);
    this.clearDefaultRpt = this.clearDefaultRpt.bind(this);
    this.rptDeletionPrompt = this.rptDeletionPrompt.bind(this);
    this.filterByTeam = this.filterByTeam.bind(this);
    this.toggleSidebar = this.toggleSidebar.bind(this);
    this.closeImportSidebar = this.closeImportSidebar.bind(this);
    this.saveRankOverrides = this.saveRankOverrides.bind(this);
    this.setDefaultRound = this.setDefaultRound.bind(this);
    this.changeBadgeFilter = this.changeBadgeFilter.bind(this);
    this.importGamesFromFileList = this.importGamesFromFileList.bind(this);
  }

  /**
   * Lifecyle method. Initialize listeners to ipcs from main process and other stuff
   */
  componentDidMount() {
    //initialize modals
    M.Modal.init(document.querySelectorAll(
      '#addTeam, #addGame, #editDivision, #rptConfig, #assignDivisions, #assignPhases'),
      {onCloseEnd: this.onModalClose, dismissible: false}
    );
    //listen for escape key to close modals, since we made them non-dismissible so that
    // clicking outside them doesn't close them
    $(document).on("keydown", (event) => {
      if(event.keyCode == 27) {
        const openModal = document.querySelector('.modal.open');
        if(openModal) { M.Modal.getInstance(openModal).close(); }
      }
    });

    Mousetrap.bind(['command+f', 'ctrl+f'], () => {
      if(!this.anyModalOpen()) {
        $('#search').focus();
        $('#search').select();
      }
    });
    Mousetrap.bind(['command+t', 'ctrl+t'], () => {
      if(!this.anyModalOpen()) { this.openTeamModal('add', null); }
    });
    Mousetrap.bind(['command+g', 'ctrl+g'], () => {
      if(!this.anyModalOpen()) { this.openGameModal('add', null); }
    });
    Mousetrap.bind(['command+left', 'ctrl+left'], () => {
      if(!this.anyModalOpen()) { this.previousPage(); }
    });
    Mousetrap.bind(['command+right', 'ctrl+right'], () => {
      if(!this.anyModalOpen()) { this.nextPage(); }
    });
    Mousetrap.bind('alt+left', () => {
      if(!this.anyModalOpen()) { this.advancePhaseTab(-1); }
    });
    Mousetrap.bind('alt+right', () => {
      if(!this.anyModalOpen()) { this.advancePhaseTab(1); }
    });
    Mousetrap.bind('alt+shift+left', () => {
      if(!this.anyModalOpen()) { this.setState({sidebarOpen: true}); }
    });
    Mousetrap.bind('alt+shift+right', () => {
      if(!this.anyModalOpen()) { this.setState({sidebarOpen: false}); }
    });
    //set up event listeners
    ipc.on('compileStatReport', (event, message) => {
      this.writeStatReport('');
    });
    ipc.on('saveTournamentAs', (event, fileName) => {
      this.writeJSON(fileName);
      ipc.sendSync('setWindowTitle',
        fileName.substring(fileName.lastIndexOf('\\')+1, fileName.lastIndexOf('.')));
      ipc.sendSync('successfulSave');
    });
    ipc.on('openTournament', (event, fileName) => {
      this.loadTournament(fileName);
    });
    ipc.on('importRosters', (event, fileName) =>  {
      this.importRosters(fileName);
    });
    ipc.on('importNeg5', (event, fileName) => {
      this.importNeg5(fileName);
    });
    ipc.on('importQbjSingleGames', (event, filePaths) => {
      this.importQbjGamesFromFilePaths(filePaths);
    });
    ipc.on('mergeTournament', (event, fileName) => {
      this.mergeTournament(fileName);
    });
    ipc.on('saveExistingTournament', (event, fileName) => {
      this.writeJSON(fileName);
      ipc.sendSync('successfulSave');
    });
    ipc.on('newTournament', (event) => {
      if(!this.anyModalOpen()) { this.resetState(); }
    });
    ipc.on('exportHtmlReport', (event, fileStart) => {
      if(!this.anyModalOpen()) { this.writeStatReport(fileStart); }
    });
    ipc.on('trySqbsExport', (event) => {
      if(this.anyModalOpen()) { return; }
      var badGameAry = this.sqbsCompatErrors();
      if(badGameAry.length == 0) { ipc.sendSync('exportSqbsFile'); }
      else { ipc.sendSync('confirmLossySQBS', badGameAry); }
    });
    ipc.on('exportSqbsFile', (event, fileName) => {
      if(!this.anyModalOpen()) { this.writeSqbsFile(fileName); }
    });
    ipc.on('exportQbj', (event, fileName) => {
      if(!this.anyModalOpen()) { this.writeQbjFile(fileName); }
    });
    ipc.on('confirmGameDeletion', (event) => {
      this.deleteGame();
    });
    ipc.on('cancelGameDeletion', (event) => {
      this.setState({
        gameToBeDeleted: null
      });
    });
    ipc.on('confirmDivDeletion', (event) => {
      this.deleteDivision();
    });
    ipc.on('cancelDivDeletion', (event) => {
      this.setState({
        divToBeDeleted: null
      });
    });
    ipc.on('openRptConfig', (event) => {
      if(!this.anyModalOpen()) { this.openRptConfigModal(); }
    });
    ipc.on('rptDeleteConfirmation', (event, rptName) => {
      this.deleteRpt(rptName);
    });
    ipc.on('setActiveRptConfig', (event, rptName) => {
      this.setState({
        activeRpt: rptName
      });
    });
    ipc.on('toggleFormField', (event, whichField, status) => {
      this.toggleFormField(whichField, status);
    });
    ipc.on('loadReportConfig', (event, env) => {
      this.loadCustomRptConfigs(env);
    });
  } //componentDidMount

  /*---------------------------------------------------------
  Lifecyle method.
  I'm not certain this is necessary, but just to be safe....
  ---------------------------------------------------------*/
  componentWillUnmount() {
    ipc.removeAllListeners('addTeam');
    ipc.removeAllListeners('addGame');
    ipc.removeAllListeners('compileStatReport');
    ipc.removeAllListeners('saveTournamentAs');
    ipc.removeAllListeners('openTournament');
    ipc.removeAllListeners('importRosters');
    ipc.removeAllListeners('importNeg5');
    ipc.removeAllListeners('importQbjSingleGames');
    ipc.removeAllListeners('mergeTournament');
    ipc.removeAllListeners('saveExistingTournament');
    ipc.removeAllListeners('newTournament');
    ipc.removeAllListeners('exportHtmlReport');
    ipc.removeAllListeners('exportSqbsFile');
    ipc.removeAllListeners('exportQbj');
    ipc.removeAllListeners('confirmGameDeletion');
    ipc.removeAllListeners('cancelGameDeletion');
    ipc.removeAllListeners('confirmDivDeletion');
    ipc.removeAllListeners('cancelDivDeletion');
    ipc.removeAllListeners('openRptConfig');
    ipc.removeAllListeners('rptDeleteConfirmation');
    ipc.removeAllListeners('setActiveRptConfig');
    ipc.removeAllListeners('toggleFormField');
    ipc.removeAllListeners('toggleSidebar');
    ipc.removeAllListeners('loadRptConfigs');
  } //componentWillUnmount

  /*---------------------------------------------------------
  Lifecycle method.
  ---------------------------------------------------------*/
  componentDidUpdate() {
  }

  /*---------------------------------------------------------
  Load report configurations, after the main process has
  told us where to look. Called once when the application
  starts.
  ---------------------------------------------------------*/
  loadCustomRptConfigs(env) {
    //load report configurations from files. Paths are defined in index.html
    var loadRpts = fs.readFileSync(RELEASED_RPT_CONFIG_FILE, 'utf8');
    var releasedRptList = JSON.parse(loadRpts).rptConfigList;
    var defaultRpt = SYS_DEFAULT_RPT_NAME;

    var customRptFile = env != 'development' ? CUSTOM_RPT_CONFIG_FILE_PROD : CUSTOM_RPT_CONFIG_FILE_DEV;

    if(fs.existsSync(customRptFile)) {
      loadRpts = fs.readFileSync(customRptFile, 'utf8');
      var customRptConfig = JSON.parse(loadRpts);
      var customRptList = customRptConfig.rptConfigList;
      if(customRptList[customRptConfig.defaultRpt] != undefined) {
        defaultRpt = customRptConfig.defaultRpt;
      }
    }
    else {
      var customRptList = {};
      fs.writeFile(customRptFile, JSON.stringify(EMPTY_CUSTOM_RPT_CONFIG), 'utf8', function(err) {
        if (err) { console.log(err); }
      });
    }
    // don't allow >25 custom configs (you'd have to manually mess with the file to have this happen)
    if(Object.keys(customRptList).length > MAX_CUSTOM_RPT_CONFIGS) {
      var customRptSlice = Object.keys(customRptList).slice(MAX_CUSTOM_RPT_CONFIGS);
      for(var i in customRptSlice) { delete customRptList[customRptSlice[i]]; }
    }

    ipc.sendSync('rebuildMenus', releasedRptList, customRptList, defaultRpt);

    this.setState({
      releasedRptList: releasedRptList, // list of uneditable report configurations
      customRptList: customRptList, // list of user-created report configurations
      customRptFile: customRptFile, // file path to store use configuration
      defaultRpt: defaultRpt, // which report configuration is default for new tournaments
      activeRpt: defaultRpt, // which report configuration is currently being used
    });
  }

  /*---------------------------------------------------------
  Called when the user saves the file.
  Filename: the file to write to
  ---------------------------------------------------------*/
  writeJSON(fileName) {
    var tempSettings = this.state.settings;
    // whichever report config is active becomes this tournament's config
    tempSettings.rptConfig = this.state.activeRpt;
    var fileString = JSON.stringify(METADATA) + '\n' +
      JSON.stringify(this.state.packets) + '\n' +
      JSON.stringify(tempSettings) + '\n' +
      JSON.stringify(this.state.divisions) + '\n' +
      JSON.stringify(this.state.allTeams) + '\n' +
      JSON.stringify(this.state.allGames);

    new Promise(function(resolve, reject) {
      resolve(fs.writeFileSync(fileName, fileString, 'utf8', StatUtils2.printError));
    }).then(() => {
      ipc.sendSync('setWindowTitle', fileName.substring(fileName.lastIndexOf('\\')+1, fileName.lastIndexOf('.')));
      return 1;
    }).catch((err) => {
      ipc.sendSync('genericModal', 'error', 'Error', 'Error saving file:\n\n' + err.stack, true);
    });
    this.setState({
      settings: tempSettings
    });
  }

  /*---------------------------------------------------------
  Parse the file and return an array containing each section
  ---------------------------------------------------------*/
  parseFile(fileName) {
    var fileString = fs.readFileSync(fileName, 'utf8');
    // compatibility with previous file format. Who knows why I thought this was necessary
    for(var i=1; i<=3; i++) { fileString = fileString.replace('divider_between_sections\n',''); }
    var jsonAry = fileString.split('\n', 6);
    if(jsonAry.length < 5) {
      //versions prior to 2.0.0 don't have metadata or packet names
      return [JSON.stringify({version:'1.9.9'}),'{}'].concat(jsonAry);
    }
    return jsonAry;
  }

  /*---------------------------------------------------------
  Update the game index with the games being loaded from a
  file. set startOver to true to wipe out the current index,
  false to add to it.
  ---------------------------------------------------------*/
  loadGameIndex(loadGames, startOver) {
    var round, tempIndex;
    if(startOver) { tempIndex = {}; }
    else { tempIndex = this.state.gameIndex; }
    for(var i in loadGames) {
      round = loadGames[i].round;
      if(round === null || round === undefined) { continue; }
      if(tempIndex[round] == undefined) {
        tempIndex[round] = 1;
      }
      else { tempIndex[round] = tempIndex[round]+1; }
    }
    this.setState({
      gameIndex: tempIndex
    });
  }

  /*---------------------------------------------------------
  Update the player index with the games being loaded from a
  file. set startOver to true to wipe out the current index,
  false to add to it.
  ---------------------------------------------------------*/
  loadPlayerIndex(loadTeams, loadGames, startOver) {
    var curTeam, tempIndex, idxPiece;
    if(startOver) {
      tempIndex = {};
      for(var i in loadTeams) {
        tempIndex[loadTeams[i].teamName] = {};
      }
    }
    else {
      tempIndex = this.state.playerIndex;
    }
    for(var i in loadGames) {
      var curGame = loadGames[i];
      var team1 = curGame.team1, team2 = curGame.team2;
      if(tempIndex[team1] == undefined) { tempIndex[team1] = {}; }
      for(var p in curGame.players1) {
        if(tempIndex[team1][p] == undefined) { tempIndex[team1][p] = 0; }
        if(curGame.players1[p].tuh > 0) { tempIndex[team1][p]++; }
      }
      if(tempIndex[team2] == undefined) { tempIndex[team2] = {}; }
      for(var p in curGame.players2) {
        if(tempIndex[team2][p] == undefined) { tempIndex[team2][p] = 0; }
        if(curGame.players2[p].tuh > 0) { tempIndex[team2][p]++; }
      }
    }
    this.setState({
      playerIndex: tempIndex
    });
  }

  /**
   * Load the tournament data from fileName into the appropriate
   * state variables. The user may now begin editing this
   * tournament.
   * @param  {string} fileName   path to the yft file
   */
  loadTournament(fileName) {
    if(fileName == null || !fileName.endsWith('.yft')) { return; }
    var [loadMetadata, loadPackets, loadSettings, loadDivisions, loadTeams, loadGames] = this.parseFile(fileName);
    loadMetadata = JSON.parse(loadMetadata);
    loadPackets = JSON.parse(loadPackets);
    loadSettings = JSON.parse(loadSettings);
    loadDivisions = JSON.parse(loadDivisions);
    loadTeams = JSON.parse(loadTeams);
    loadGames = JSON.parse(loadGames);
    var assocRpt = loadSettings.rptConfig;

    if(StatUtils2.versionLt(METADATA.version, loadMetadata.version, 'minor')) {
      let verAry = loadMetadata.version.split('.');
      verAry[2] = '0';
      ipc.sendSync('genericModal', 'error', 'Cannot load tournament',
        'Upgrade to version ' + verAry.join('.') + ' or higher to load this tournament');
      return;
    }

    //if coming from 2.0.4 or earlier, there's no default phase
    if(loadSettings.defaultPhase == undefined && loadSettings. defaultPhases == undefined) {
      loadSettings.defaultPhases = [];
    }
    else {
      if(StatUtils2.versionLt(loadMetadata.version, '2.4.0')) {
        StatUtils2.settingsConversion2x4x0(loadSettings);
      }
      if(StatUtils2.versionLt(loadMetadata.version, '2.5.0')) {
        StatUtils2.settingsConversion2x5x0(loadSettings);
      }
    }

    //if coming from 2.1.0 or earlier, assign the system default report
    if(assocRpt == undefined) {
      assocRpt = SYS_DEFAULT_RPT_NAME;
    }
    //convert teams and games to new data structures
    if(StatUtils2.versionLt(loadMetadata.version, '2.1.0')) {
      StatUtils2.teamConversion2x1x0(loadTeams);
    }
    if(StatUtils2.versionLt(loadMetadata.version, '2.2.0')) {
      StatUtils2.teamConversion2x2x0(loadTeams);
    }
    if(StatUtils2.versionLt(loadMetadata.version, '2.3.0')) {
      StatUtils2.teamConversion2x3x0(loadTeams);
    }
    if(StatUtils2.versionLt(loadMetadata.version, '2.4.0')) {
      StatUtils2.gameConversion2x4x0(loadGames);
    }
    if(StatUtils2.versionLt(loadMetadata.version, '2.5.0')) {
      StatUtils2.gameConversion2x5x0(loadGames);
    }
    if(StatUtils2.versionLt(loadMetadata.version, '2.5.2')) {
      StatUtils2.gameConversion2x5x2(loadGames);
    }
    if(StatUtils2.versionLt(loadMetadata.version, '3.0.0')) {
      StatUtils2.gameConversion3x0x0(loadGames);
    }
    //revert to system defaults if we can't find this file's report configuration
    if(this.state.releasedRptList[assocRpt] == undefined && this.state.customRptList[assocRpt] == undefined) {
      assocRpt = SYS_DEFAULT_RPT_NAME;
    }

    // misc game-related tasks
    var tbCount = 0;
    for(let g of loadGames) {
      tbCount += g.tiebreaker;
      this.validateGame(g, loadSettings);
    }

    ipc.sendSync('setWindowTitle',
      fileName.substring(fileName.lastIndexOf('\\')+1, fileName.lastIndexOf('.')));
    ipc.sendSync('rebuildMenus', this.state.releasedRptList, this.state.customRptList, assocRpt);

    this.setState({
      settings: loadSettings,
      packets: loadPackets,
      divisions: loadDivisions,
      allTeams: loadTeams,
      allGames: loadGames,
      tbCount: tbCount,
      allGamesShowTbs: false,
      settingsLoadToggle: !this.state.settingsLoadToggle,
      viewingPhase: 'all',
      activePane: 'settingsPane',
      activeRpt: assocRpt,
      teamOrder: 'alpha',
      queryText: '',
      selectedTeams: [],
      selectedGames: [],
      reconstructSidebar: !this.state.reconstructSidebar,
      defaultRound: null,
      badgeFilter: null,
      importResult: null
    });
    //the value of settingsLoadToggle doesn't matter; it just needs to change
    //in order to make the settings form load
    this.loadGameIndex(loadGames, true);
    this.loadPlayerIndex(loadTeams, loadGames, true);
  }

  /*---------------------------------------------------------
  Load rosters from an SQBS file. Other data is ignored.
  ---------------------------------------------------------*/
  importRosters(fileName) {
    var fileString = fs.readFileSync(fileName, 'utf8');
    if(fileString != '') {
      var sqbsAry = fileString.split('\n');
    }
    var allTeams = this.state.allTeams.slice();
    var existingTeams = allTeams.map((o) => { return o.teamName; });
    var teamsAdded = [], renamedTeams = '';
    var dupTeams = [];
    var curLine = 0;
    var numTeams = sqbsAry[curLine++]; // first line is number of teams
    if(isNaN(numTeams)) {
      ipc.sendSync('genericModal', 'error', 'Import error',
        'Import failed. Encountered an error on line ' + curLine + ' of the SQBS file.');
      return;
    }
    for(var i=0; i<numTeams; i++) {
      let rosterSize = sqbsAry[curLine++] - 1; // first line of team is number of players + 1
      if(isNaN(rosterSize)) {
        ipc.sendSync('genericModal', 'error', 'Import error',
          'Import failed. Encountered an error on line ' + curLine + ' of the SQBS file.');
        return;
      }
      let teamName = sqbsAry[curLine++].trim(); // second line of team is team name
      if(teamName == '') { continue; }
      //throw out teams that are already in YF
      if(!this.validateTeamName(teamName, null)) {
        curLine += rosterSize;
        dupTeams.push(teamName);
        continue;
      }
      // if a team appearas twice in the SQBS file, append a number at the end of its name
      let dupNo = 2;
      let origName = teamName;
      while(teamsAdded.includes(teamName)) {
        teamName = origName + dupNo;
        dupNo++;
      }
      if(origName != teamName) {
        renamedTeams += '\n' + origName + ' to ' + teamName;
      }

      let roster = {};
      let lowercaseRoster = [];
      for(var j=0; j<rosterSize && j<MAX_PLAYERS_PER_TEAM; j++) {
        let nextPlayer = sqbsAry[curLine++].trim();
        // assume year is within parentheses and at the end of the player name
        let yearAry = nextPlayer.match(/\(.*\)$/);
        let nextPlayerYear = yearAry != null ? yearAry[0] : '';
        nextPlayerYear = nextPlayerYear.replace(/[\(\)]/g, '');
        let nextPlayerName = nextPlayer.replace(/\(.*\)$/, '');
        if(!lowercaseRoster.includes(nextPlayerName.toLowerCase())) {
          roster[nextPlayerName] = {year: nextPlayerYear, div2: false, undergrad: false};
          lowercaseRoster.push(nextPlayerName.toLowerCase());
        }
      }
      teamsAdded.push(teamName);
      allTeams.push({
        teamName: teamName,
        smallSchool: false,
        jrVarsity: false,
        teamUGStatus: false,
        teamD2Status: false,
        roster: roster,
        divisions: {},
      });
    }
    var numImported = teamsAdded.length;
    if(numImported > 0) {
      this.setState({
        allTeams: allTeams,
        reconstructSidebar: !this.state.reconstructSidebar
      });
      this.loadPlayerIndex(allTeams, this.state.allGames, true);

      let message = 'Imported ' + numImported + ' teams.\n\n';
      if(dupTeams.length > 0) {
        message += 'The following teams already exist and were not imported:\n\n' +
          dupTeams.join('\n');
      }
      ipc.sendSync('genericModal', 'info', 'Successful import', message);
      ipc.sendSync('unsavedData');
      if(renamedTeams.length > 3) {
        ipc.sendSync('genericModal', 'warning', 'Duplicate teams',
          'Some teams were renamed because they appeared multiple times in the SQBS file:\n\n' + renamedTeams);
      }
    }
    else if(dupTeams.length > 0) {
      ipc.sendSync('genericModal', 'warning', 'YellowFruit',
        'No teams were imported because all teams in the file already exist.');
    }
  } // importRosters

  /**
   * Validate and load a Neg5 qbj file.
   * @param  {string} fileName path to file to import
   */
  importNeg5(fileName) {
    var fileString = fs.readFileSync(fileName, 'utf8');
    if(fileString != '') {
      var qbj = JSON.parse(fileString);
    }
    if(qbj.version != 1.2) {
      ipc.sendSync('genericModal', 'error', 'Import QBJ',
        'QBJ import failed:\n\nOnly tournament schema version 1.2 is supported');
      return;
    }
    var tournament, registrations = [], matches = [];
    let badObject = '';
    for(var i in qbj.objects) {
      let obj = qbj.objects[i];
      switch (obj.type) {
        case 'Tournament':
          tournament = obj;
          break;
        case 'Registration':
          registrations.push(obj);
          break;
        case 'Match':
          matches.push(obj);
          break;
        default:
          badObject = obj.type;
      }
      if(badObject != '') {
        ipc.sendSync('genericModal', 'error', 'Import QBJ',
          'QBJ import failed:\n\nUnrecognized object of type ' + badObject);
        return;
      }
    }
    var [yfRules, ruleErrors] = Neg5Import.parseQbjRules(tournament.scoring_rules);
    if(ruleErrors.length > 0) {
      ipc.sendSync('genericModal', 'error', 'Import QBJ',
        'QBJ import failed:\n\n' + ruleErrors.join('\n'));
      return;
    }
    yfRules.defaultPhases = DEFAULT_SETTINGS.defaultPhases;
    yfRules.rptConfig = DEFAULT_SETTINGS.rptConfig;

    var [yfTeams, teamIds, teamErrors] = Neg5Import.parseQbjTeams(tournament, registrations);
    if(teamErrors.length > 0) {
      ipc.sendSync('genericModal', 'error', 'Import QBJ',
        'QBJ import failed:\n\n' + teamErrors.join('\n'));
      return;
    }

    var rounds = tournament.phases[0].rounds;
    var [yfGames, gameErrors] = Neg5Import.parseQbjMatches(rounds, matches, teamIds);
    if(gameErrors.length > 0) {
      ipc.sendSync('genericModal', 'error', 'Import QBJ',
        'QBJ import failed:\n\n' + gameErrors.join('\n'));
      return;
    }
    var [gameErrors, gameWarnings] = Neg5Import.validateMatches(yfGames, yfRules);
    if(gameErrors.length > 0) {
      ipc.sendSync('genericModal', 'error', 'Import QBJ',
        'QBJ import failed:\n\n' + gameErrors.join('\n'));
      return;
    }
    if(gameWarnings.length > 0) {
      ipc.sendSync('genericModal', 'warning', 'Import QBJ',
        'You may want to correct the following issues:\n\n' + gameWarnings.join('\n'));
    }
    var tbCount = 0;
    for(var i in yfGames) { tbCount += yfGames[i].tiebreaker; }

    this.setState({
      settings: yfRules,
      packets: [],
      divisions: {},
      tbCount: tbCount,
      allTeams: yfTeams,
      allGames: yfGames,
      allGamesShowTbs: false,
      settingsLoadToggle: !this.state.settingsLoadToggle,
      viewingPhase: 'all',
      activePane: 'settingsPane',
      teamOrder: 'alpha',
      queryText: '',
      selectedTeams: [],
      selectedGames: [],
      activeRpt: this.state.defaultRpt,
      reconstructSidebar: !this.state.reconstructSidebar,
      defaultRound: null,
      badgeFilter: null,
      importResult: null
    });

    this.loadGameIndex(yfGames, true);
    this.loadPlayerIndex(yfTeams, yfGames, true);
    ipc.sendSync('genericModal', 'info', 'Import QBJ',
      'Imported ' + yfTeams.length + ' teams and ' + yfGames.length + ' games.');
    ipc.sendSync('unsavedData');
  }

  /**
   * Process file paths provided by the main process to give to importQbjSingleGames
   * @param  {string[]} filePaths               list of full file paths
   */
  importQbjGamesFromFilePaths(filePaths) {
    let fileObjs = [];
    for(const path of filePaths) {
      const filePathSegments = path.split(/[\\\/]/);
      fileObjs.push({file: path, name: filePathSegments.pop()});
    }
    this.importQbjSingleGames(fileObjs, this.readDataFromFile);
  }

  /**
   * Import single-game qbj files.
   * @param  {ImportableGame[]} gameFiles array of files, either file paths or base64 encodings of their contents
   * @param  {(string) => string} readFile  function to process the file into a JSON string
   */
  importQbjSingleGames(gameFiles, readFile) {
    if(!gameFiles || gameFiles.length < 1) {
      ipc.sendSync('genericModal', 'error', 'Game import',
        'Game import failed:\n\n no files specified.');
      return;
    }
    // Need to verify that the tournament currently exists with at least two teams
    if (this.state.allTeams == undefined || this.state.allTeams.length < 2) {
      ipc.sendSync('genericModal', 'error', 'Game import',
        'Game import failed:\n\n At least two teams must exist in the tournament.');
      return;
    }

    let rejectedFiles = [];
    let acceptedGames = [];
    let importResult = {
      rejected: [],
      errors: 0,
      warnings: 0,
      successes: 0
    }
    for(const file of gameFiles) {
      const fileContents = readFile(file.file);
      const shortFileName = file.name;
      let result;
      if(fileContents != '') {
        result = SingleGameQBJImport.importGame(this.state.allTeams, fileContents, this.state.settings)
      }

      if (!result.success) {
        importResult.rejected.push({fileName: shortFileName, message: result.error});
        continue;
      }
      // fill in round if we have one
      if(this.state.defaultRound !== null) {
        result.result.round = this.state.defaultRound;
      }
      // add current phase, if there is one
      if(this.state.viewingPhase != 'all' && this.state.viewingPhase != 'Tiebreakers') {
        result.result.phases = [this.state.viewingPhase];
      }

      //if a team has already played this round, import the game without a round number
      let [teamAPlayed, teamBPlayed] = this.haveTeamsPlayedInRound(result.result.team1, result.result.team2, result.result.round, null)
      if(teamAPlayed || teamBPlayed) {
        result.result.round = null;
      }
      // same with the other games that have already been imported in this batch
      else {
        let [teamAPlayed, teamBPlayed] =
          this.haveTeamsPlayedInRound(result.result.team1, result.result.team2, result.result.round, null, acceptedGames);
        if(teamAPlayed || teamBPlayed) {
          result.result.round = null;
        }
      }
      acceptedGames.push(result.result);
      this.validateGame(result.result, this.state.settings);
      if(result.result.invalid) {
        importResult.errors++;
      }
      else if (result.result.validationMsg) {
        importResult.warnings++;
      }
      else {
        importResult.successes++;
      }
    }
    this.addGames(acceptedGames, false);
    ipc.sendSync('unsavedData');

    this.setState({
      importResult: importResult,
      sidebarOpen: true
    });
    // if the user only imported one game, and that game has issues, open the form so that they can fix it
    if(gameFiles.length == 1 && acceptedGames.length == 1 && !importResult.successes) {
      this.openGameModal('edit', acceptedGames[0]);
    }
  }

  /**
   * Return a string with a file's data, given its path.
   * @param  {string} filePath               full file path
   * @return {string}          file contents
   */
  readDataFromFile(filePath) {
    return fs.readFileSync(filePath, 'utf8');
  }

  /**
   * Return a string with a file's data, given its base64 Data URL
   * @param  {string} data               base64-encoded Data URL
   * @return {string}      plain-text contents of the file
   */
  readDataFromDataURL(data) {
    const contents = data.replace(/data.+,/, '');
    return atob(contents);
  }

  /**
   * Read the contents of the specified files so their games can be imported.
   * @param  {FileList} files               list of File objects
   */
  importGamesFromFileList(files) {
    console.log(files);
    let filesToImport = [], validFileCount = 0;
    for(let i = 0; i < files.length; i++) {
      if(files[i].name && (files[i].name.endsWith('.qbj') || files[i].name.endsWith('.json'))) {
        validFileCount++;
      }
    }
    for(let i = 0; i < files.length; i++) {
      const shortName = files[i].name;
      if(!shortName || (!shortName.endsWith('.qbj') && !shortName.endsWith('.json'))) {
        continue;
      }
      const reader = new FileReader();
      reader.addEventListener("load", () => {
          filesToImport.push({file: reader.result, name: shortName});
          if(filesToImport.length == validFileCount) {
            this.importQbjSingleGames(filesToImport, this.readDataFromDataURL);
          }
        }, false);
      reader.readAsDataURL(files[i]);
    }
  }

  /**
   * Merge the tournament in fileName into this one.
   * @param  {string} fileName path to file to merge into this tournament
   */
  mergeTournament(fileName) {
    if(fileName == '') { return; }
    var [loadMetadata, loadPackets, loadSettings, loadDivisions, loadTeams, loadGames] = this.parseFile(fileName);
    loadMetadata = JSON.parse(loadMetadata);
    loadSettings = JSON.parse(loadSettings);
    loadDivisions = JSON.parse(loadDivisions);
    loadTeams = JSON.parse(loadTeams);
    loadGames = JSON.parse(loadGames);
    //need to do this conversion before we can compare settings
    if(StatUtils2.versionLt(loadMetadata.version, '2.5.0')) {
      StatUtils2.settingsConversion2x5x0(loadSettings);
    }
    //reject files from a higher version than this one
    if(StatUtils2.versionLt(METADATA.version, loadMetadata.version, 'minor')) {
      let verAry = loadMetadata.version.split('.');
      verAry[2] = '0';
      ipc.sendSync('genericModal', 'error', 'Cannot load tournament',
        'Upgrade to version ' + verAry.join('.') + ' or higher to load this tournament');
      return;
    }

    // check settings
    if(!StatUtils2.settingsEqual(loadSettings, this.state.settings)) {
      ipc.sendSync('genericModal', 'error', 'Merge failed', 'Tournaments with different settings cannot be merged');
      return;
    }
    // merge divisions
    var divisionsCopy = $.extend(true, {}, this.state.divisions);
    for(var p in loadDivisions) {
      if(divisionsCopy[p] == undefined) {
        divisionsCopy[p] = loadDivisions[p];
      }
      else {
        for(var i in loadDivisions[p]) {
          if(!divisionsCopy[p].includes(loadDivisions[p][i])) {
            divisionsCopy[p].push(loadDivisions[p][i]);
          }
        }
      }
    }
    //convert team and game data structures if necessary
    if(StatUtils2.versionLt(loadMetadata.version, '2.1.0')) {
      StatUtils2.teamConversion2x1x0(loadTeams);
    }
    if(StatUtils2.versionLt(loadMetadata.version, '2.2.0')) {
      StatUtils2.teamConversion2x2x0(loadTeams);
    }
    if(StatUtils2.versionLt(loadMetadata.version, '2.3.0')) {
      StatUtils2.teamConversion2x3x0(loadTeams);
    }
    if(StatUtils2.versionLt(loadMetadata.version, '2.4.0')) {
      StatUtils2.gameConversion2x4x0(loadGames);
    }
    // merge teams
    var teamsCopy = this.state.allTeams.slice();
    var newTeamCount = 0;
    for(var i in loadTeams) {
      var newTeam = loadTeams[i];
      var oldTeam = teamsCopy.find((t) => { return t.teamName == newTeam.teamName; });
      if(oldTeam == undefined) {
        teamsCopy.push(newTeam);
        newTeamCount++;
      }
      else {
        // merge rosters
        for(var p in newTeam.roster) {
          if(oldTeam.roster[p] == undefined) {
            oldTeam.roster[p] = newTeam.roster[p];
          }
        }
        // merge division assignments
        for(var p in newTeam.divisions) {
          if(oldTeam.divisions[p] == undefined) {
            oldTeam.divisions[p] = newTeam.divisions[p];
          }
        }
      }
    }
    // merge games
    var gamesCopy = this.state.allGames.slice();
    var newGameCount = 0, tbCount = this.state.tbCount;
    var conflictGames = [];
    for(let g of loadGames) {
      this.validateGame(g, this.state.settings);
      if(!StatUtils2.mergeConflictGame(g, gamesCopy)) {
        gamesCopy.push(g);
        newGameCount++;
        tbCount += g.tiebreaker;
      }
      else { conflictGames.push(g); }
    }
    this.setState({
      divisions: divisionsCopy,
      allTeams: teamsCopy,
      allGames: gamesCopy,
      tbCount: tbCount,
      settingsLoadToggle: !this.state.settingsLoadToggle,
      reconstructSidebar: !this.state.reconstructSidebar,
      badgeFilter: null
    });
    this.loadGameIndex(gamesCopy, false);
    this.loadPlayerIndex(teamsCopy, gamesCopy, false);
    ipc.sendSync('unsavedData');

    var mergeSummary = 'Added ' + newTeamCount + ' new teams and ' + newGameCount +
      ' new games.';
    if(conflictGames.length > 0) {
      mergeSummary += '\n\nThe following games were not added because teams cannot' +
        'play multiple non-tiebreaker games in the same round:\n\n';
      for(var i in conflictGames) {
        let g = conflictGames[i];
        mergeSummary += 'Round ' + g.round + ': ' + g.team1 + ' vs. ' + g.team2 + '\n';
      }
    }

    ipc.sendSync('genericModal', 'info', 'Successful merge', mergeSummary);
  } // mergeTournament

  /**
   * Compile and write data for the html stat report.
   * @param  {string} fileStart User-specified directory plus beginning of the file name,
   *                            to which we append the standard suffixes. Pass null
   *                            when generating the in-app stat report
   */
  writeStatReport(fileStart) {
    if(fileStart == '') {
      var standingsLocation = DEF_STANDINGS_FILE;
      var individualsLocation = DEF_INDIVIDUALS_FILE;
      var scoreboardLocation = DEF_SCOREBOARD_FILE;
      var teamDetailLocation = DEF_TEAMDETAIL_FILE;
      var playerDetailLocation = DEF_PLAYERDETAIL_FILE;
      var roundReportLocation = DEF_ROUNDREPORT_FILE;
    }
    else {
      fileStart = fileStart + '_';
      var standingsLocation = fileStart + 'standings.html';
      var individualsLocation = fileStart + 'individuals.html';
      var scoreboardLocation = fileStart + 'games.html';
      var teamDetailLocation = fileStart + 'teamdetail.html';
      var playerDetailLocation = fileStart + 'playerdetail.html';
      var roundReportLocation = fileStart + 'rounds.html';
    }
    var filterPhase = this.state.viewingPhase;
    var phasesToGroupBy = this.phasesToGroupBy();
    var [divsInPhase, phaseSizes] = this.cumulativeRankSetup(phasesToGroupBy);
    var usingDivisions = divsInPhase.length > 0;
    //we only want the last segment of the file path to use for links
    var filePathSegments = fileStart.split(/[\\\/]/);
    var endFileStart = filePathSegments.pop();

    var showTbs = this.state.allGamesShowTbs;
    var phaseColors = {}, phaseCnt = 0;
    for(var p in this.state.divisions) {
      if(p != "noPhase") { phaseColors[p] = PHASE_COLORS[phaseCnt++]; }
    }
    if(this.state.tbCount > 0 && showTbs) {
      phaseColors["Tiebreakers"] = '#9e9e9e'; // for phase legends
    }

    var activeRpt = this.state.releasedRptList[this.state.activeRpt];
    if(activeRpt == undefined) { activeRpt = this.state.customRptList[this.state.activeRpt]; }

    var teams = this.state.allTeams, games = this.state.allGames,
      settings = this.state.settings, packets = this.state.packets;

    Promise.all([
      StatUtils.getStandingsPage(teams, games, endFileStart, filterPhase, phasesToGroupBy,
        divsInPhase, phaseSizes, settings, activeRpt, showTbs, appVersion),
      StatUtils.getIndividualsPage(teams, games, endFileStart, filterPhase, phasesToGroupBy,
        usingDivisions, settings, activeRpt, showTbs),
      StatUtils.getScoreboardPage(games, endFileStart, filterPhase, settings, packets,
        phaseColors, showTbs),
      StatUtils.getTeamDetailPage(teams, games, endFileStart, filterPhase, packets, settings,
        phaseColors, activeRpt, showTbs),
      StatUtils.getPlayerDetailPage(teams, games, endFileStart, filterPhase, settings, phaseColors,
        activeRpt, showTbs),
      StatUtils.getRoundReportPage(games, endFileStart, filterPhase, packets, settings,
        activeRpt, showTbs),
    ]).then(([standings, individuals, scoreboard, teamDet, playerDet, roundRep]) => {
      fs.writeFileSync(standingsLocation, standings, 'utf8', StatUtils2.printError);
      fs.writeFileSync(individualsLocation, individuals, 'utf8', StatUtils2.printError);
      fs.writeFileSync(scoreboardLocation, scoreboard, 'utf8', StatUtils2.printError);
      fs.writeFileSync(teamDetailLocation, teamDet, 'utf8', StatUtils2.printError);
      fs.writeFileSync(playerDetailLocation, playerDet, 'utf8', StatUtils2.printError);
      fs.writeFileSync(roundReportLocation, roundRep, 'utf8', StatUtils2.printError);
      return 1;
    }).then(() => {
      if(fileStart == '') { ipc.sendSync('statReportReady'); }
      else { this.toast('Stat report generated'); }
    }).catch((err) => {
      let message = 'Error generating stat report:\n\n';
      if(err.stack.includes('EROFS: read-only file system')) {
        message += 'If you are running this application from your downloads folder, you ' +
          'may need to move it to another directory.\n\n';
      }
      ipc.sendSync('genericModal', 'error', 'Error', message + err.stack, true);
    });

  } //writeStatReport

  /*---------------------------------------------------------
  Export the data in SQBS format
  ---------------------------------------------------------*/
  writeSqbsFile(fileName) {
    var phasesToGroupBy = this.phasesToGroupBy();
    var [divsInPhase, phaseSizes] = this.cumulativeRankSetup(phasesToGroupBy);

    var sqbsData = SqbsUtils.getSqbsFile(this.state.settings, this.state.viewingPhase,
      phasesToGroupBy, divsInPhase, this.state.allTeams, this.state.allGames,
      this.state.packets, this.state.gameIndex, this.state.allGamesShowTbs);
    new Promise(function(resolve, reject) {
      resolve(fs.writeFileSync(fileName, sqbsData, 'utf8', StatUtils2.printError));
    }).then(() => {
      this.toast('SQBS file generated');
    }).catch((err) => {
      ipc.sendSync('genericModal', 'error', 'Error', 'Error saving file:\n\n' + err.stack, true);
    });
  } //writeSqbsFile

  /*---------------------------------------------------------
  Export the data in tournament schema format
  ---------------------------------------------------------*/
  writeQbjFile(fileName) {
    if(!fileName) { return; }
    var tournName = fileName.split(Path.sep).pop();
    tournName = tournName.replace(/.qbj/i, '');
    var tbsExist = this.state.tbCount > 0;
    var schemaObj = QbjExport.getQbjFile(this.state.settings, this.state.divisions,
      this.state.allTeams, this.state.allGames, this.state.packets, tbsExist, tournName);
    new Promise(function(resolve, reject) {
      resolve(fs.writeFileSync(fileName, JSON.stringify(schemaObj), 'utf8', StatUtils2.printError));
    }).then(() => {
      this.toast('QBJ file generated');
    }).catch((err) => {
      ipc.sendSync('genericModal', 'error', 'Error', 'Error saving file:\n\n' + err.stack, true);
    });
  }

  /**
   * Returns a list of games in which at least one team had more than eight players that heard at
   * least one tossup. SQBS only supports eight players per team per game, so we need to warn the
   * user before exporting the SQBS file.
   * @return list game names (round no. + teams) to show to the user
   */
  sqbsCompatErrors() {
    var badGameAry = [];
    for(var i in this.state.allGames) {
      var g = this.state.allGames[i];
      var playerCount = 0;
      for(var p in g.players1) {
        if(g.players1[p].tuh > 0) { playerCount++; }
      }
      if(playerCount > 8) {
        badGameAry.push('Round ' + g.round + ': ' + g.team1 + " vs. " + g.team2);
        continue;
      }
      playerCount = 0;
      for(var p in g.players2) {
        if(g.players2[p].tuh > 0) { playerCount++; }
      }
      if(playerCount > 8) {
        badGameAry.push('Round ' + g.round + ': ' + g.team1 + " vs. " + g.team2);
      }
    }
    return badGameAry;
  }

  /**
   * Clear data and go back to defaults. Called when the user selects "new tournament".
   */
  resetState() {
    const defSettingsCopy = $.extend(true, {}, DEFAULT_SETTINGS);
    this.setState({
      tmWindowVisible: false,
      gmWindowVisible: false,
      divEditWindowVisible: false,
      rptConfigWindowVisible: false,
      divWindowVisible: false,
      phaseWindowVisible: false,
      teamOrder: 'alpha',
      queryText: '',
      settings: defSettingsCopy,
      packets: {},
      divisions: {},
      allTeams: [],
      allGames: [],
      gameIndex: {},
      playerIndex: {},
      tbCount: 0,
      allGamesShowTbs: false,
      selectedTeams: [],
      selectedGames: [],
      checkTeamToggle: false,
      checkGameToggle: false,
      settingsLoadToggle: !this.state.settingsLoadToggle,
      activePane: 'settingsPane',  //settings, teams, or games
      viewingPhase: 'all',
      editWhichDivision: null,
      divAddOrEdit: 'add',
      editWhichTeam: null,
      tmAddOrEdit: 'add', //either 'add' or 'edit'
      editWhichGame: null,
      gmAddOrEdit: 'add',
      editingSettings: false,
      gameToBeDeleted: null,
      divToBeDeleted: null,
      activeRpt: this.state.defaultRpt,
      reconstructSidebar: !this.state.reconstructSidebar,
      defaultRound: 1,
      badgeFilter: null,
      importResult: null
      // DO NOT reset these! These should persist throughout the session
      // releasedRptList: ,
      // customRptList: ,
      // defaultRpt: ,
      // formSettings
    });
    ipc.sendSync('rebuildMenus', this.state.releasedRptList, this.state.customRptList, this.state.defaultRpt);
  }

  /*---------------------------------------------------------
  Whether any of the modal windows are open
  ---------------------------------------------------------*/
  anyModalOpen() {
    return this.state.tmWindowVisible || this.state.gmWindowVisible ||
      this.state.divEditWindowVisible || this.state.rptConfigWindowVisible ||
      this.state.divWindowVisible || this.state.phaseWindowVisible;
  }

  /*---------------------------------------------------------
  Move to the previous page (settings/teams/games)
  ---------------------------------------------------------*/
  previousPage() {
    var newPane = 'settingsPane';
    if(this.state.activePane == 'settingsPane') { newPane = 'gamesPane'; }
    else if(this.state.activePane == 'teamsPane') { newPane = 'settingsPane'; }
    else if(this.state.activePane == 'gamesPane') { newPane = 'teamsPane'; }
    this.setState({
      activePane: newPane
    });
  }//previousPage

  /*---------------------------------------------------------
  Move to the next page (settings/teams/games)
  ---------------------------------------------------------*/
  nextPage() {
    var newPane = 'settingsPane';
    if(this.state.activePane == 'settingsPane') { newPane = 'teamsPane'; }
    else if(this.state.activePane == 'teamsPane') { newPane = 'gamesPane'; }
    else if(this.state.activePane == 'gamesPane') { newPane = 'settingsPane'; }
    this.setState({
      activePane: newPane
    });
  }//previousPage

  /**
   * Move the specified number of phase tabs from the current one.
   * @param  {number} n number of tabs. Negative=left, positive=right
   */
  advancePhaseTab(n) {
    let phaseList = Object.keys(this.state.divisions);
    phaseList = _.without(phaseList, 'noPhase');
    phaseList = ['all'].concat(phaseList);
    if(this.state.tbCount > 0) { phaseList.push('Tiebreakers'); }

    let oldPhaseNo = phaseList.indexOf(this.state.viewingPhase);
    let numPhases = phaseList.length;
    let newPhase = phaseList[(numPhases + oldPhaseNo + n) % numPhases];

    this.setState({
      viewingPhase: newPhase
    });
  }

  /**
   * Open the modal for editing divisions
   * @param  {'add' | 'edit'} addOrEdit whether we're adding a new division or editing an existing one
   * @param {DraggableDivision} divToedit which division to load in the form
   */
  openDivEditModal(addOrEdit, divToedit) {
    if(this.anyModalOpen()) { return; }
    let partialState = {
      divEditWindowVisible: true,
      divAddOrEdit: addOrEdit
    };
    if(divToedit) { partialState.editWhichDivision = divToedit; }
    this.setState(partialState);
    // for some reason I can't call focus() normally for this field.
    // fortunately this delay is not perceptible
    setTimeout(function() { $('#divisionName').focus() }, 50);
  }

  /**
   * Kick off opening the team modal
   * @param  {'add' | 'edit'} addOrEdit whether we're adding a new team or editing an existing one
   * @param {YfTeam} teamToEdit which team to load in the form
   */
  openTeamModal(addOrEdit, teamToEdit) {
    let partialState = {
      tmWindowVisible: true,
      tmAddOrEdit: addOrEdit
    };
    if(teamToEdit) { partialState.editWhichTeam = teamToEdit; }
    this.setState(partialState);
    setTimeout(() => { $('#teamName').focus() }, 50);
  }

  /**
   * Kick off opening the game modal
   * @param  {'add' | 'edit'} addOrEdit whether we're adding a new game or editing an existing one
   * @param {YfGame} gameToEdit which game to load in the form
   */
  openGameModal(addOrEdit, gameToEdit) {
    if(this.state.allTeams.length < 2 || this.state.editingSettings) { return; }
    let partialState = {
      gmWindowVisible: true,
      gmAddOrEdit: addOrEdit
    };
    if(gameToEdit) { partialState.editWhichGame = gameToEdit; }
    this.setState(partialState);
    setTimeout(function() { $('#round').focus() }, 50);
  }

  /**
   * Open a Materialize modal
   * @param  {string} descriptor id of the modal
   */
  materializeOpenModal(descriptor) {
    M.Modal.getInstance(document.querySelector(descriptor)).open();
  }

  /**
   * Prevents modals from staying open on the next render. Also directs modals to clear their data.
   */
  onModalClose() {
    this.setState({
      divEditWindowVisible: false,
      editWhichDivision: null,
      tmWindowVisible: false,
      editWhichTeam: null,
      gmWindowVisible: false,
      editWhichGame: null,
      rptConfigWindowVisible: false,
      divWindowVisible: false,
      phaseWindowVisible: false,
      selectedTeams: [],
      selectedGames: [],
      checkTeamToggle: !this.state.checkTeamToggle,
      checkGameToggle: !this.state.checkGameToggle,
    });
  }

  /**
   * Add the new team, then close the form
   * @param {YFTeam} tempItem      team to add
   * @param {boolean} acceptAndStay pass true if the Accept and Stay button was clicked
   */
  addTeam(tempItem, acceptAndStay) {
    tempItem.divisions = {}; // fill in properties that aren't defined in the AddTeamModal
    tempItem.rank = null;

    let tempTms = this.state.allTeams.slice();
    tempTms.push(tempItem);
    let settings = this.state.settings;
    ipc.sendSync('unsavedData');
    //update player index
    let tempIndex = this.state.playerIndex, teamName = tempItem.teamName;
    tempIndex[teamName] = {};
    for(let p in tempItem.roster) { tempIndex[teamName][p] = 0; }
    this.setState({
      allTeams: tempTms,
      tmWindowVisible: acceptAndStay,
      settings: settings,
      playerIndex: tempIndex,
      reconstructSidebar: !this.state.reconstructSidebar
    }) //setState
    if(acceptAndStay) {
      $('#teamName').focus();
      this.toast('Added ' + teamName);
    }
  } //addTeam

  /**
   * Add the new game, then close the form
   * @param {YfGame} tempItem       game to be added
   * @param {boolean} acceptAndStay if true, keep the form open
   */
  addGame(tempItem, acceptAndStay) {
    this.addGames([tempItem], acceptAndStay);
    if(acceptAndStay) {
      $('#round').focus();
      var gameDisp = 'Round ' + tempItem.round + ' ' + tempItem.team1 + ' vs ' + tempItem.team2;
      this.toast('Added ' + gameDisp);
      $('#toast-container').addClass('toast-bottom-left');
    }
  } //addTeam

  /**
   * Add a games to the list of all games.
   * @param {YfGame[]} gamesToAdd     games to be added
   * @param {boolean} acceptAndStay  if true, keep the form open
   */
  addGames(gamesToAdd, acceptAndStay) {
    var tempGms = this.state.allGames.slice();
    var tempGameIndex = this.state.gameIndex;
    var tempPlayerIndex = this.state.playerIndex;
    var tbCount = this.state.tbCount;
    for(const g of gamesToAdd) {
      tempGms.push(g);
      let round = g.round;
      if(round !== null && round !== undefined) {
        if(tempGameIndex[round] == undefined) { tempGameIndex[round] = 1; }
        else { tempGameIndex[round]++; }
      }
      StatUtils2.addGameToPlayerIndex(g, tempPlayerIndex);
      tbCount += g.tiebreaker;
    }
    ipc.sendSync('unsavedData');
    this.setState({
      allGames: tempGms,
      gameIndex: tempGameIndex,
      playerIndex: tempPlayerIndex,
      tbCount : tbCount,
      gmWindowVisible: acceptAndStay,
      badgeFilter: null
    }) //setState
  }

  /**
   * Update the appropriate team, close the form, and update team and player names in
   * that team's games if necessary. Assumes whitespace has already been removed from
   * the form data
   * @param  {YFTeam} oldTeam       team's previous data
   * @param  {YfTeam} newTeam       new data for the team
   * @param  {boolean} acceptAndStay true if Accept and Stay button was clicked
   */
  modifyTeam(oldTeam, newTeam, acceptAndStay) {
    let tempTeams = this.state.allTeams.slice();
    let tempGames = this.state.allGames.slice();
    const originalNames = Object.keys(oldTeam.roster), newNames = Object.keys(newTeam.roster);

    for(var i in originalNames) {
      let oldn = originalNames[i], newn = newNames[i];
      if(oldn != newn) { // including if newn is undefined, or is a deleted player placeholder
        if(newn == undefined || newTeam.roster[newn].deleted != undefined) {
          newn = ''; // don't count deleted player placeholders as actual players
        }
        this.updatePlayerName(tempGames, oldTeam.teamName, oldn, newn);
      }
    }

    if(oldTeam.teamName != newTeam.teamName) {
      this.updateTeamName(tempGames, oldTeam.teamName, newTeam.teamName);
    }

    //update index
    var tempPlayerIndex = this.state.playerIndex;
    var newTeamCopy = $.extend(true, {}, newTeam);
    StatUtils2.modifyTeamInPlayerIndex(oldTeam, newTeamCopy, tempPlayerIndex);

    //don't save the dummy placeholders for deleted teams
    var deletedTeams = [];
    for(var p in newTeam.roster) {
      if(newTeam.roster[p].deleted != undefined) { deletedTeams.push(p); }
    }
    for(var i in deletedTeams) {
      delete newTeam.roster[deletedTeams[i]];
    }
    var oldTeamIdx = _.indexOf(tempTeams, oldTeam);
    tempTeams[oldTeamIdx] = newTeam;

    newTeam.divisions = oldTeam.divisions;
    newTeam.rank = oldTeam.rank;

    ipc.sendSync('unsavedData');
    this.setState({
      allTeams: tempTeams,
      allGames: tempGames,
      tmWindowVisible: acceptAndStay,
      playerIndex: tempPlayerIndex,
      tmAddOrEdit: 'add', // need to set here in case of acceptAndStay
      reconstructSidebar: !this.state.reconstructSidebar
    });
    if(acceptAndStay) {
      $('#teamName').focus();
      this.toast('Saved ' + newTeam.teamName);
    }
  }//modifyTeam

  /*---------------------------------------------------------
  Change the name of team oldName to newName for all
  applicable games in gameAry
  ---------------------------------------------------------*/
  updateTeamName(gameAry, oldName, newName) {
    for(var i in gameAry){
      if(gameAry[i].team1 == oldName) {
        gameAry[i].team1 = newName;
      }
      if(gameAry[i].team2 == oldName) {
        gameAry[i].team2 = newName;
      }
    }
  }

  /*---------------------------------------------------------
  Change the name of team teamName's player oldPlayerName to
  newPlayerName for all applicable games in gameAry.
  Pass the empty string as newPlayerName in order to simply delete
  this player
  ---------------------------------------------------------*/
  updatePlayerName(gameAry, teamName, oldPlayerName, newPlayerName) {
    for(var i in gameAry) {
      if(gameAry[i].forfeit) { continue; }
      if(teamName == gameAry[i].team1) {
        if(newPlayerName != '') {
          let statLine = gameAry[i].players1[oldPlayerName];
          if(statLine != undefined) {
            gameAry[i].players1[newPlayerName] = statLine;
          }
        }
        delete gameAry[i].players1[oldPlayerName];
      }
      else if(teamName == gameAry[i].team2) {
        if(newPlayerName != '') {
          let statLine = gameAry[i].players2[oldPlayerName];
          if(statLine != undefined) {
            gameAry[i].players2[newPlayerName] = statLine;
          }
        }
        delete gameAry[i].players2[oldPlayerName];
      }
    }
  }

  /**
   * Update the appropriate game and close the form
   * @param  {yfGame} oldGame                     game we're modifying
   * @param  {YfGame} newGame                     new data for that game
   * @param  {boolean} acceptAndStay              whether to keep the form open
   */
  modifyGame(oldGame, newGame, acceptAndStay) {
    var tempGameAry = this.state.allGames.slice();
    var oldGameIdx = _.findIndex(tempGameAry, function (o) {
       return StatUtils2.gameEqual(o, oldGame)
     });
    tempGameAry[oldGameIdx] = newGame;
    // update game index
    var tempGameIndex = this.state.gameIndex;
    var oldRound = oldGame.round, newRound = newGame.round;
    if(oldRound != newRound) {
      if(tempGameIndex[newRound] == undefined) { tempGameIndex[newRound] = 1; }
      else { tempGameIndex[newRound]++; }
      if(oldRound !== null && oldRound !== undefined) {
        if(--tempGameIndex[oldRound] == 0) { delete tempGameIndex[oldRound]; }
      }
    }
    var tempPlayerIndex = this.state.playerIndex;
    StatUtils2.modifyGameInPlayerIndex(oldGame, newGame, tempPlayerIndex);
    ipc.sendSync('unsavedData');
    this.setState({
      allGames: tempGameAry,
      gameIndex: tempGameIndex,
      playerIndex: tempPlayerIndex,
      tbCount: this.state.tbCount - oldGame.tiebreaker + newGame.tiebreaker,
      gmWindowVisible: acceptAndStay,
      gmAddOrEdit: 'add', // needed in case of acceptAndStay
    });
    if(acceptAndStay) {
      $('#round').focus();
      var gameDisp = 'Round ' + newGame.round + ' ' + newGame.team1 + ' vs ' + newGame.team2;
      this.toast('Saved ' + gameDisp);
      $('#toast-container').addClass('toast-bottom-left');
    }
  }

  /*---------------------------------------------------------
  Permanently delete a team. Does not check whether that team
  has any game data; make sure it doesn't before calling!
  ---------------------------------------------------------*/
  deleteTeam(item) {
    var newTeams = _.without(this.state.allTeams, item);
    var newSelected = _.without(this.state.selectedTeams, item);
    var tempPlayerIndex = this.state.playerIndex;
    delete tempPlayerIndex[item.teamName];
    this.setState({
      allTeams: newTeams,
      selectedTeams: newSelected,
      playerIndex: tempPlayerIndex,
      reconstructSidebar: !this.state.reconstructSidebar
    });
    ipc.sendSync('unsavedData');
  } //deleteTeam

  /**
   * Called twice during the game deletion workflow. The first
   * time it triggers a confirmation message. The sencond time,
   * once the user has confirmed, it permanently deletes the
   * game
   * @param  {YfGame} item               game user wants to delete
   */
  deleteGame(item) {
    if(this.state.gameToBeDeleted == null) {
      this.setState({
        gameToBeDeleted: item
      });
      let roundString;
      if(item.round === null || item.round === undefined) {
        roundString = '(No round)';
      }
      else { roundString = 'Round ' + item.round; }
      ipc.send('tryGameDelete', roundString + ': ' + item.team1 + ' vs. ' + item.team2);
      return;
    }
    var allGames = this.state.allGames;
    var newGames = _.without(allGames, this.state.gameToBeDeleted);
    // update index
    var tempGameIndex = this.state.gameIndex, round = this.state.gameToBeDeleted.round;
    if(round !== null && round !== undefined) {
      if(--tempGameIndex[round] == 0) { delete tempGameIndex[round]; }
    }
    var tempPlayerIndex = this.state.playerIndex;
    StatUtils2.modifyGameInPlayerIndex(this.state.gameToBeDeleted, null, tempPlayerIndex);
    var newTbCount = this.state.tbCount - this.state.gameToBeDeleted.tiebreaker;
    var newViewingPhase = this.state.viewingPhase;
    if(newTbCount == 0 && newViewingPhase == 'Tiebreakers') {
      newViewingPhase = 'all';
    }
    this.setState({
      allGames: newGames,
      gameIndex: tempGameIndex,
      playerIndex: tempPlayerIndex,
      tbCount: newTbCount,
      viewingPhase: newViewingPhase,
      gameToBeDeleted: null
    });
    ipc.sendSync('unsavedData');
  } //deleteGame

  /*---------------------------------------------------------
  Remove the given team's division assignment for the given
  phase.
  ---------------------------------------------------------*/
  removeDivisionFromTeam(whichTeam, phase) {
    var tempTeams = this.state.allTeams;
    var idx = _.indexOf(tempTeams, whichTeam);
    delete tempTeams[idx].divisions[phase];
    this.setState({
      allTeams: tempTeams
    });
    ipc.sendSync('unsavedData');
  }

  /*---------------------------------------------------------
  Dissociate the specified game from the specified phase
  ---------------------------------------------------------*/
  removePhaseFromGame(whichGame, phase) {
    var tempGames = this.state.allGames;
    var idx = _.indexOf(tempGames, whichGame);
    _.pull(tempGames[idx].phases, phase);
    this.setState({
      allGames: tempGames
    });
    ipc.sendSync('unsavedData');
  }

  /*---------------------------------------------------------
  Determine whether newDivName is a legal division name.
  Can't already be the name of an existing division in
  newPhase, other than savedDivision, the one that's
  currently being edited
  ---------------------------------------------------------*/
  validateDivisionName(newDivName, newPhase, savedDivision) {
    var otherDivisions = this.state.divisions[newPhase];
    if(otherDivisions == undefined) { return true; }
    if(savedDivision != null) {
      otherDivisions = _.without(otherDivisions, savedDivision.divisionName);
    }
    var idx = otherDivisions.findIndex((d) => {
      return d.toLowerCase() == newDivName.toLowerCase();
    });
    return idx==-1;
  }

  /*---------------------------------------------------------
  Determine whether newTeamName is a legal team name.
  Can't already be the name of an existing team other
  than savedTeam, the one that's currently being edited.
  ---------------------------------------------------------*/
  validateTeamName(newTeamName, savedTeam) {
    var otherTeams;
    if(savedTeam != null) {
      otherTeams = _.without(this.state.allTeams, savedTeam);
    }
    else {
      otherTeams = this.state.allTeams;
    }
    var idx = otherTeams.findIndex((t) => {
      return t.teamName.toLowerCase() == newTeamName.toLowerCase();
    });
    return idx==-1;
  }

  /**
   * Validate a game and set the validation attributes accordingly
   * @param  {YfGame} game  game to validate
   * @param  {TournamentSettings} settings
   */
  validateGame(game, settings) {
    const result = GameVal.validateGame(game, settings);
    const errorLevel = result.type;
    game.invalid = !result.isValid;
    if(errorLevel == 'error' || errorLevel == 'warning')
      game.validationMsg = result.message;
  }

  /**
   * Whether the given teams have already played in this round.
   * @param  teamA                            name of the first team
   * @param  teamB                            name of the second team
   * @param  roundNo                          round number
   * @param  originalGameLoaded               the game currently being modified
   * @param  altGameList                      list of games to look at; if null, use the normal list of all games
   * @return                    array with two values, one for each team:
                                 0: has not played a game
                                 1: has played a tiebreaker
                                 2: has played a non-tiebreaker
                                 3: both teams have already played each other in this round
   */
  haveTeamsPlayedInRound(teamA, teamB, roundNo, originalGameLoaded, altGameList) {
    const gameList = altGameList ? altGameList : this.state.allGames;
    var teamAPlayed = 0, teamBPlayed = 0;
    for(let g of gameList) {
      if(g.round === null || g.round === undefined) { continue; }
      if(g.round == roundNo && !StatUtils2.gameEqual(g, originalGameLoaded)) {
        if((g.team1 == teamA && g.team2 == teamB) || (g.team2 == teamA && g.team1 == teamB)) {
          return [3, 3];
        }
        if(g.team1 == teamA || g.team2 == teamA) {
          if(g.tiebreaker && teamAPlayed <= 1) { teamAPlayed = 1; }
          else { teamAPlayed = 2; }
        }
        if(g.team1 == teamB || g.team2 == teamB) {
          if(g.tiebreaker && teamBPlayed <= 1) { teamBPlayed = 1; }
          else { teamBPlayed = 2; }
        }
      }
    }
    return [teamAPlayed, teamBPlayed];
  }

  /*---------------------------------------------------------
  Whether this team has played at least one game.
  ---------------------------------------------------------*/
  teamHasPlayedGames(team) {
    for(var i in this.state.allGames) {
      var g = this.state.allGames[i];
      if(g.team1 == team.teamName || g.team2 == team.teamName) { return true; }
    }
    return false;
  }

  /*---------------------------------------------------------
  Save the packet names
  ---------------------------------------------------------*/
  savePackets(packets) {
    this.setState({
      packets: packets
    });
    ipc.sendSync('unsavedData');
  }

  /*---------------------------------------------------------
  Sort teams
  ---------------------------------------------------------*/
  reOrder(orderBy, orderDir) {
    this.setState({
      orderBy: orderBy,
      orderDir: orderDir
    }) //setState
  } //reOrder

  /*---------------------------------------------------------
  Fiter teams or games
  ---------------------------------------------------------*/
  searchLists(query) {
    this.setState({
      queryText: query
    }); //setState
  } //searchLists

  /*---------------------------------------------------------
  Whether the user is viewing settings, teams, or games`
  ---------------------------------------------------------*/
  setPane(pane) {
    this.setState({
      activePane: pane,
    });
  } //setPane

  /*---------------------------------------------------------
  Which phase the user is viewing
  ---------------------------------------------------------*/
  setPhase(phase) {
    this.setState({
      viewingPhase: phase
    });
  }

  /*---------------------------------------------------------
  Open or close the sidebar
  ---------------------------------------------------------*/
  toggleSidebar() {
    this.setState({
      sidebarOpen: !this.state.sidebarOpen
    })
  }

  /**
   * Remove the import results from the sidebar (and go back to the normal stats sidebar)
   */
  closeImportSidebar() {
    this.setState({
      importResult: null
    });
  }

  /*---------------------------------------------------------
  Add a single new division to the specified phase
  (Phase can be 'noPhase')
  acceptAndStay is true if we want the modal to stay open,
  false if not.
  ---------------------------------------------------------*/
  addDivision(divName, phase, acceptAndStay) {
    var tempDivisions = this.state.divisions;
    if(phase == 'noPhase' && tempDivisions.noPhase == undefined) {
      tempDivisions.noPhase = [];
    }
    tempDivisions[phase].push(divName);
    //select a new default grouping phase if there wasn't one before
    var newDefaultPhases = this.state.settings.defaultPhases;
    if(newDefaultPhases.length == 0) {
      var phaseList = Object.keys(this.state.divisions);
      var numPhases = phaseList.length;
      if(numPhases > 0) {
        var lastPhase = phaseList[numPhases - 1];
        if(lastPhase == 'noPhase' && numPhases > 1) {
          lastPhase = phaseList[numPhases - 2];
        }
        if(lastPhase != 'noPhase') {
          newDefaultPhases = [lastPhase];
        }
      }
    }
    var newSettings = this.state.settings;
    newSettings.defaultPhases = newDefaultPhases;
    this.setState({
     divisions: tempDivisions,
     divEditWindowVisible: acceptAndStay,
     settings: newSettings,
     settingsLoadToggle: !this.state.settingsLoadToggle
    });
    ipc.sendSync('unsavedData');
    if(acceptAndStay) {
      $('#divisionName').focus();
      var phaseDisplay = phase != 'noPhase' ? ' (' + phase + ')' : '';
      this.toast('Added ' + divName + phaseDisplay);
    }
  }

  /*---------------------------------------------------------
  Modify a single division
  acceptAndStay is true if we want the modal to stay open,
  false if not.
  ---------------------------------------------------------*/
  modifyDivision(oldDivision, newDivName, newPhase, acceptAndStay) {
    var tempDivisions = this.state.divisions;
    var tempTeams = this.state.allTeams;
    var oldDivName = oldDivision.divisionName, oldPhase = oldDivision.phase;
    //if phase was changed remove it from teams and from division structure
    if(oldPhase != newPhase) {
      for(var i in tempTeams) {
        if(tempTeams[i].divisions[oldPhase] == oldDivName) {
          delete tempTeams[i].divisions[oldPhase];
        }
      }
      _.pull(tempDivisions[oldPhase], oldDivName);
      if(newPhase != 'noPhase') {
        tempDivisions[newPhase].push(newDivName);
      }
      else {
        if(tempDivisions.noPhase != undefined) { tempDivisions.noPhase.push(newDivName); }
        else { tempDivisions.noPhase = [newDivName]; }
      }
    }
    //otherwise just change division name
    else if(oldDivName != newDivName) {
      for(var i in tempTeams) {
        if(tempTeams[i].divisions[newPhase] == oldDivName) {
          tempTeams[i].divisions[newPhase] = newDivName;
        }
      }
      var idx = tempDivisions[newPhase].findIndex((d) => { return d == oldDivName });
      tempDivisions[newPhase][idx] = newDivName;
    }
    this.setState({
      divisions: tempDivisions,
      allTeams: tempTeams,
      settingsLoadToggle: !this.state.settingsLoadToggle,
      divEditWindowVisible: acceptAndStay,
      divAddOrEdit: 'add' // need to reset this here in case of acceptAndStay
    });
    ipc.sendSync('unsavedData');
    if(acceptAndStay) {
      $('#divisionName').focus();
      var phaseDisplay = newPhase != 'noPhase' ? ' (' + newPhase + ')' : '';
      this.toast('Saved ' + newDivName + phaseDisplay);
    }
  } //modifyDivision

  /*---------------------------------------------------------
  Delete a single division
  Called twice during the division deletion workflow. The
  first time it triggers a confirmation message. The second
  time, once the user has confirmed, it permanently deletes
  the game
  ---------------------------------------------------------*/
  deleteDivision(item) {
    if(this.state.divToBeDeleted == null) {
      this.setState({
        divToBeDeleted: item
      });
      var phaseString = item.phase != 'noPhase' ? ' (' + item.phase + ')' : ''
      ipc.send('tryDivDelete', item.divisionName + phaseString);
      return;
    }
    // delete the division from any teams that have it
    var tempTeams = this.state.allTeams;
    var divName = this.state.divToBeDeleted.divisionName;
    var phase = this.state.divToBeDeleted.phase;
    for(var i in tempTeams) {
      if(tempTeams[i].divisions[phase] == divName) {
        delete tempTeams[i].divisions[phase];
      }
    }
    // delete the division from the division object
    var tempDivisions = this.state.divisions;
    _.pull(tempDivisions[phase], divName);
    if(phase == 'noPhase' && tempDivisions.noPhase.length == 0) {
      delete tempDivisions.noPhase;
    }
    // delete default grouping phase if there are no more divisions
    var divsExist = false, newSettings = this.state.settings;
    for(var p in tempDivisions) {
      if(tempDivisions[p].length > 0) { divsExist = true; }
    }
    if(!divsExist) { newSettings.defaultPhases = []; }
    this.setState({
      divisions: tempDivisions,
      teams: tempTeams,
      settings: newSettings,
      settingsLoadToggle: !this.state.settingsLoadToggle,
      divToBeDeleted: null
    });
    ipc.sendSync('unsavedData');
  }//deleteDivision

  /*---------------------------------------------------------
  reorder the list of divisions so that droppedItem is
  immediately above receivingItem
  ---------------------------------------------------------*/
  reorderDivisions(droppedItem, receivingItem) {
    // don't bother if the divisions are from different phases, or if they're the same division
    if(droppedItem.phase != receivingItem.phase ||
      droppedItem.divisionName == receivingItem.divisionName) {
        return;
      }
    var phase = droppedItem.phase;
    var tempDivisions = this.state.divisions;
    var onePhase = _.without(tempDivisions[phase], droppedItem.divisionName);
    var recItemIdx = onePhase.indexOf(receivingItem.divisionName);
    tempDivisions[phase] = onePhase.slice(0,recItemIdx).concat([droppedItem.divisionName], onePhase.slice(recItemIdx));
    this.setState({
      divisions: tempDivisions,
      settingsLoadToggle: !this.state.settingsLoadToggle,
    });
    ipc.sendSync('unsavedData');
  }

  /*---------------------------------------------------------
  Modify phases and divisions, as well as the assignments
  of teams to divisions and games to phases if necessary.
  Called from the settings form.
  ---------------------------------------------------------*/
  savePhases(newPhases, newDivAry, nameChanges) {
    var tempDivisions = $.extend(true, {}, this.state.divisions);
    var divsWithDeletedPhases = [];
    // adjust division structure
    for(var phase in this.state.divisions) {
      // rename phases
      if(nameChanges[phase] != undefined) {
        delete tempDivisions[phase];
        tempDivisions[nameChanges[phase]] = this.state.divisions[phase];
      }
      // remove phases that were deleted
      else if(!newPhases.includes(phase) && phase != 'noPhase') {
        divsWithDeletedPhases = divsWithDeletedPhases.concat(this.state.divisions[phase]);
        delete tempDivisions[phase];
      }
    }
    for(var i in newPhases) {
      // initialize new phases
      let phase = newPhases[i];
      if(tempDivisions[phase] == undefined){
        tempDivisions[phase] = [];
      }
    }
    if(tempDivisions.noPhase != undefined) {
      tempDivisions.noPhase = tempDivisions.noPhase.concat(divsWithDeletedPhases);
    }
    else if(divsWithDeletedPhases.length > 0) {
      tempDivisions.noPhase = divsWithDeletedPhases;
    }
    // put the phases back in the order they were listed when the user submitted the form,
    //  so that the order doesn't change arbitrarily
    var reorderedPhases = {};
    for(var i in newPhases) {
      reorderedPhases[newPhases[i]] = tempDivisions[newPhases[i]];
    }
    if(tempDivisions.noPhase != undefined) {
      reorderedPhases.noPhase = tempDivisions.noPhase;
    }
    tempDivisions = reorderedPhases;

    // adjust team structure
    var tempTeams = this.state.allTeams.slice();
    for(var i in this.state.allTeams) {
      let tm = this.state.allTeams[i]
      for(var phase in tm.divisions) {
        // rename phases
        if(nameChanges[phase] != undefined) {
          tempTeams[i].divisions[nameChanges[phase]] = tm.divisions[phase];
          delete tempTeams[i].divisions[phase];
        }
        // remove phases that were deleted
        else if(!newPhases.includes(phase)) {
          delete tempTeams[i].divisions[phase];
        }
      }
    }

    // adjust game structure
    var tempGames = this.state.allGames.slice();
    for(var i in this.state.allGames) {
      let gm = this.state.allGames[i];
      for(var j in gm.phases) {
        let phase = gm.phases[j];
        // rename phases
        if(nameChanges[phase] != undefined) {
          _.pull(tempGames[i].phases, phase);
          tempGames[i].phases.push(nameChanges[phase]);
        }
        // remove phases that were deleted
        if(!newPhases.includes(phase)) {
          _.pull(tempGames[i].phases, phase);
        }
      }
    }

    //can't be viewing a phase that doesn't exist
    var newViewingPhase = this.state.viewingPhase;
    if(newViewingPhase != 'Tiebreakers' && !newPhases.includes(newViewingPhase)) {
      newViewingPhase = 'all';
    }
    //modify default grouping phases if necessary
    var oldDefaultPhases = this.state.settings.defaultPhases;
    var newDefaultPhases = this.state.settings.defaultPhases.slice();
    for(var i in oldDefaultPhases) {
      //can't have default grouping phases that don't exist
      if(!newPhases.includes(oldDefaultPhases[i])) {
        _.pull(newDefaultPhases, oldDefaultPhases[i]);
      }
    }
    // add a default phase if there isn't one yet
    if(newDefaultPhases.length == 0 && newPhases.length > 0 && this.usingDivisions()) {
      newDefaultPhases.push(newPhases[newPhases.length - 1]);
    }

    var newSettings = this.state.settings;
    newSettings.defaultPhases = newDefaultPhases;

    this.setState({
      divisions: tempDivisions,
      allTeams: tempTeams,
      allGames: tempGames,
      viewingPhase: newViewingPhase,
      settings: newSettings,
      settingsLoadToggle: !this.state.settingsLoadToggle
    });
    ipc.sendSync('unsavedData');
  } //savePhases

  /*---------------------------------------------------------
  When a team is selected or deselected using the checkbox
  ---------------------------------------------------------*/
  onSelectTeam(whichTeam) {
    var tempSelTeams = this.state.selectedTeams.slice();
    var idx = tempSelTeams.indexOf(whichTeam);
    if(idx == -1) { tempSelTeams.push(whichTeam); }
    else { _.pull(tempSelTeams, whichTeam); }
    this.setState({
      selectedTeams: tempSelTeams
    });
  }

  /*---------------------------------------------------------
  When a game is selected/deselected using the checkbox
  ---------------------------------------------------------*/
  onSelectGame(whichGame) {
    var tempSelGames = this.state.selectedGames.slice();
    var idx = tempSelGames.indexOf(whichGame);
    if(idx == -1) { tempSelGames.push(whichGame); }
    else { _.pull(tempSelGames, whichGame); }
    this.setState({
      selectedGames: tempSelGames
    });
  }

  /*---------------------------------------------------------
  Open the modal for configuring report settings
  ---------------------------------------------------------*/
  openRptConfigModal() {
    this.setState({
      rptConfigWindowVisible: true
    });
  }

  /*---------------------------------------------------------
  Open the modal for assigning teams to divisions
  ---------------------------------------------------------*/
  openDivModal() {
    if(this.state.selectedTeams.length == 0) { return; }
    this.setState({
      divWindowVisible: true
    });
  }

  /*---------------------------------------------------------
  Open the modal for assigning games to phases
  ---------------------------------------------------------*/
  openPhaseModal() {
    if(this.state.selectedGames.length == 0) { return; }
    this.setState({
      phaseWindowVisible: true
    });
  }

  /*---------------------------------------------------------
  Assign divisions to the selected teams.
  ---------------------------------------------------------*/
  submitDivAssignments(divSelections) {
    var selTeams = this.state.selectedTeams;
    var allTeams = this.state.allTeams;
    for(var i in selTeams) {
      var tmIdx = allTeams.indexOf(selTeams[i]);
      for(var phase in divSelections) {
        var div = divSelections[phase];
        if(div == 'remove') {
          delete allTeams[tmIdx].divisions[phase];
        }
        else if(div != 'ignore') {
          allTeams[tmIdx].divisions[phase] = div;
        }
      }
    }
    this.setState({
      divWindowVisible: false,
      allTeams: allTeams,
      selectedTeams: [],
      checkTeamToggle: !this.state.checkTeamToggle
    });
    ipc.sendSync('unsavedData');
  }//submitDivAssignments

  /*---------------------------------------------------------
  Assign phases to the selected games.
  ---------------------------------------------------------*/
  submitPhaseAssignments(phaseSelections) {
    var selGames = this.state.selectedGames;
    var allGames = this.state.allGames;
    for(var i in selGames) {
      var idx = allGames.indexOf(selGames[i]);
      for(var i in phaseSelections) {
        if(phaseSelections[i] == 'delete') {
          allGames[idx].phases = [];
        }
        else if (!allGames[idx].phases.includes(phaseSelections[i])) {
          allGames[idx].phases.push(phaseSelections[i]);
        }
      }
    }
    this.setState({
      allGames: allGames,
      phaseWindowVisible: false,
      selectedGames: [],
      checkGameToggle: !this.state.checkGameToggle
    });
    ipc.sendSync('unsavedData');
  }//submitPhaseAssignments

  /*---------------------------------------------------------
  Does the team belong to the phase the user is currently
  viewing?
  ---------------------------------------------------------*/
  teamBelongsToCurrentPhase(team) {
    var viewingPhase = this.state.viewingPhase;
    if(viewingPhase == 'all') { return true; }
    if(viewingPhase == 'Tiebreakers') { return true; } // Tiebreakers isn't a real phase
    return team.divisions[this.state.viewingPhase] != undefined;
  }

  /*---------------------------------------------------------
  Does the game belong to the phase the user is currently
  viewing?
  ---------------------------------------------------------*/
  gameBelongsToCurrentPhase(game) {
    var viewingPhase = this.state.viewingPhase;
    if(viewingPhase == 'all') { return true; }
    if(viewingPhase == 'Tiebreakers') { return game.tiebreaker; }
    return game.phases.includes(this.state.viewingPhase);
  }

  /*---------------------------------------------------------
  Set which phase's divisions will be used when viewing all
  games
  ---------------------------------------------------------*/
  setDefaultGrouping(phases) {
    var newSettings = this.state.settings;
    newSettings.defaultPhases = phases;
    this.setState({
      settings: newSettings
    });
    ipc.sendSync('unsavedData');
  }

  /*---------------------------------------------------------
  Show/hide tiebreakers when viewing all games
  ---------------------------------------------------------*/
  toggleTiebreakers(show) {
    this.setState({
      allGamesShowTbs: show
    });
  }

  /*---------------------------------------------------------
  Does this tournament have at least one user-defined phase?
  ---------------------------------------------------------*/
  usingPhases() {
    var numberOfPhases = Object.keys(this.state.divisions).length;
    return numberOfPhases > 1 ||  (numberOfPhases == 1 && this.state.divisions['noPhase'] == undefined);
  }

  /*---------------------------------------------------------
  Does this tournament have one or more divisions?
  ---------------------------------------------------------*/
  usingDivisions() {
    for (var phase in this.state.divisions) {
      if(this.state.divisions[phase].length > 0) { return true; }
    }
    return false;
  }

  /*---------------------------------------------------------
  Get the list of phases (if any) by which to group teams
  ---------------------------------------------------------*/
  phasesToGroupBy() {
    var usingPhases = this.usingPhases(), viewingPhase = this.state.viewingPhase;
    if(!usingPhases && this.usingDivisions()) { return ['noPhase']; }
    else if(viewingPhase == 'Tiebreakers') { return []; }
    else if(viewingPhase != 'all') { return [viewingPhase]; }
    else if(usingPhases) { return this.state.settings.defaultPhases; }
    return [];
  }

  /**
   * Compute the list of divisions to group teams by (could be from multiple phases),
   * and the number of divisions in each grouping phase
   * @param  {string[]} phasesToGroupBy list of phases whose divisions we're grouping teams by
   * @return {[string[], ([phase]: number)]}   tuple: first element is the ordered list of
   *    divisions to use in the team standings; second element is how many divisions
   *    belong to each phase
   */
  cumulativeRankSetup(phasesToGroupBy) {
    var divsInPhase = [], phaseSizes = {};
    for(let curPhase of phasesToGroupBy) {
      let oneDivList = this.state.divisions[curPhase];
      divsInPhase = divsInPhase.concat(oneDivList);
      //keep track of which divisions came from which phases (for the phase record column header)
      phaseSizes[curPhase] = oneDivList.length;
    }
    return [divsInPhase, phaseSizes];
  }

  /*---------------------------------------------------------
  Save the tournament format settings (powers, negs, bonuses,
  players per team.) Merges these settings into the others
  contained in the settings object.
  ---------------------------------------------------------*/
  saveSettings(newSettings) {
    this.setState ({
      settings: $.extend(true, this.state.settings, newSettings)
    });
    ipc.sendSync('unsavedData');
  }

  /*---------------------------------------------------------
  Whether the "settings" section of the settings pane is
  open for editing.
  ---------------------------------------------------------*/
  editingSettings(bool) {
    this.setState({
      editingSettings: bool
    });
  }

  /*---------------------------------------------------------
  Does the search text match this team?
  ---------------------------------------------------------*/
  teamQueryMatch(queryText, team) {
    var teamName = team.teamName.toLowerCase();
    if(queryText.startsWith('=')) { return queryText.substr(1) == teamName; }
    return teamName.indexOf(queryText)!=-1 || Object.keys(team.roster).join(', ').toLowerCase().indexOf(queryText)!=-1
  }

  /**
   * Do the filter conditions match this game?
   * @param  {string} queryText               what the user typed in the search bar
   * @param  {YfGame} game                    game to test
   * @return {boolean}           true if we should show this game in the list
   */
  gameFilterMatch(queryText, game) {
    const badgeFilter = this.state.badgeFilter;
    if(badgeFilter == 'errors' && !game.invalid) {
      return false;
    }
    if(badgeFilter == 'warnings' && (game.invalid || !game.validationMsg)) {
      return false;
    }

    if(queryText.length <= 1) { return this.gameBelongsToCurrentPhase(game); } // ignore 1-character searches for performance reasons
    if(this.noPhaseQuery(queryText, game)) { return true; }
    if(!this.gameBelongsToCurrentPhase(game)) { return false; }
    var team1 = game.team1.toLowerCase(), team2 = game.team2.toLowerCase();
    if(queryText.startsWith('=') && !queryText.includes('/')) { // '=' to require exact match
      return team1 == queryText.substr(1) || team2 == queryText.substr(1);
    }
    return game.team1.toLowerCase().indexOf(queryText)!=-1 ||
    game.team2.toLowerCase().indexOf(queryText)!=-1 ||
    game.notes.toLowerCase().indexOf(queryText)!=-1 ||
    this.matchRoundSearch(queryText,game) ||
    this.matchBothTeams(queryText, game);
  }

  /*---------------------------------------------------------
  Returns true if the query text starts with "Round###" or
  "R###" and if the game's round matches ###
  ---------------------------------------------------------*/
  matchRoundSearch(queryText, game) {
    queryText = queryText.trim();
    if(queryText.search(/^(r(ound)?\s*\d+)/i) != 0) { return false; }
    var queryRound = queryText.replace(/\D/g, '');
    return game.round == queryRound;
  }

  /*---------------------------------------------------------
  Returns true if parts of the query text (separate by a '/')
  match both teams
  ---------------------------------------------------------*/
  matchBothTeams(queryText, game) {
    var matchFirst = false, matchSecond = false;
    var team1 = game.team1.toLowerCase(), team2 = game.team2.toLowerCase();
    var words = queryText.split('/');
    words = words.map(function(str,idx) { return str.trim(); });
    words = _.without(words, '');
    if(words.length < 2) { return false; }
    for(var i in words) {
      if(words[i].startsWith('=')) {
        if(team1 == words[i].substr(1)) { matchFirst = true; }
        else if(team2 == words[i].substr(1)) { matchSecond = true; }
      }
      else {
        if(team1.indexOf(words[i])!=-1) { matchFirst = true; }
        else if(team2.indexOf(words[i])!=-1) { matchSecond = true; }
      }
    }
    return matchFirst && matchSecond;
  }

  /*---------------------------------------------------------
  Typing "no phase", "nophase", etc. in the search bar will
  find games with no assigned phase.
  ---------------------------------------------------------*/
  noPhaseQuery(queryText, game) {
    if(game.phases.length > 0 || game.tiebreaker) { return false; }
    queryText = queryText.trim();
    return queryText.search(/^(no\W*phase)/i) == 0;
  }

  /**
   * Filter the game list to those with errors or warnings
   * @param  {string} badgeId               'errors' or 'warnings'
   */
  changeBadgeFilter(badgeId) {
    if(badgeId === null) {
      this.setState({
        badgeFilter: null,
        queryText: ''
      });
      return;
    }
    if(badgeId !== 'errors' && badgeId !== 'warnings') { return; }
    let newFilterState = badgeId;
    if(badgeId == this.state.badgeFilter) { newFilterState = null; }
    this.setState({
      badgeFilter: newFilterState,
      queryText: ''
    });
  }

  /*---------------------------------------------------------
  Change how the list of teams is sorted.
  ---------------------------------------------------------*/
  sortTeamsBy(orderBy) {
    this.setState({
      teamOrder: orderBy
    });
  }

  /*---------------------------------------------------------
  When the user clicks a team's name in the sidebar,
  find that team's games. Or, if they just did that,
  clear the search bar.
  ---------------------------------------------------------*/
  filterByTeam(teamName) {
    var newQueryText = '';
    if(this.state.queryText != '=' + teamName) {
      newQueryText = '=' + teamName;
    }
    this.setState({
      queryText: newQueryText,
      navbarLoadToggle: !this.state.navbarLoadToggle
    });
  }

  /*---------------------------------------------------------
  Save the custom report configuration called rptName
  to file.
  If rptName is null, add the new configuration without
  replacing an existing one
  acceptAndStay is true if we want the modal to stay open,
  false if not.
  ---------------------------------------------------------*/
  modifyRptConfig(rptName, rptObj, newName, acceptAndStay) {
    var tempRpts = this.state.customRptList;
    var activeRpt = this.state.activeRpt;
    if(rptName != null) {
      if(this.state.customRptList[rptName] == undefined) { return; }
      delete tempRpts[rptName];
      if(activeRpt == rptName) { activeRpt = newName; }
    }
    tempRpts[newName] = rptObj; //newName may or may not be the same as rptName
    this.setState({
      customRptList: tempRpts,
      rptConfigWindowVisible: acceptAndStay,
      activeRpt: activeRpt
    });
    var newCustomRpts = {
        defaultRpt: this.state.defaultRpt,
        rptConfigList: tempRpts
    }
    var state = this.state;
    new Promise(function(resolve, reject) {
      resolve(fs.writeFileSync(state.customRptFile, JSON.stringify(newCustomRpts), 'utf8', StatUtils2.printError));
    }).then(() => {
      if(acceptAndStay) { this.toast('Saved ' + newName); }
      ipc.sendSync('rebuildMenus', this.state.releasedRptList, tempRpts, activeRpt);
      return 1;
    }).catch((err) => {
      ipc.sendSync('genericModal', 'error', 'Error', 'Error saving settings:\n\n' + err.stack, true);
    });
  }

  /*---------------------------------------------------------
  Set the default report configuration and write to file
  ---------------------------------------------------------*/
  setDefaultRpt(rptName) {
    var newCustomRpts = {
      defaultRpt: rptName,
      rptConfigList: this.state.customRptList
    }
    this.setState({
      defaultRpt: rptName,
    });
    var state = this.state;
    new Promise(function(resolve, reject) {
      resolve(fs.writeFileSync(state.customRptFile, JSON.stringify(newCustomRpts), 'utf8', StatUtils2.printError));
    }).then(() => {
      this.toast('Set ' + rptName + ' as the default for new tournaments');
      return 1;
    }).catch((err) => {
      ipc.sendSync('genericModal', 'error', 'Error', 'Error saving settings:\n\n' + err.stack, true);
    });
  }

  /*---------------------------------------------------------
  Set the default report configuration back to the original
  default and write to file.
  ---------------------------------------------------------*/
  clearDefaultRpt() {
    var newCustomRpts = {
      defaultRpt: null,
      rptConfigList: this.state.customRptList
    }
    this.setState({
      defaultRpt: SYS_DEFAULT_RPT_NAME,
    });

    var state = this.state;
    new Promise(function(resolve, reject) {
      resolve(fs.writeFileSync(state.customRptFile, JSON.stringify(newCustomRpts), 'utf8', StatUtils2.printError));
    }).then(() => {
      this.toast('Removed default status');
      return 1;
    }).catch((err) => {
      ipc.sendSync('genericModal', 'error', 'Error', 'Error saving settings:\n\n' + err.stack, true);
    });
  }

  /*---------------------------------------------------------
  Tell the main process to prompt the user to confirm that
  they want to delete this rpt
  ---------------------------------------------------------*/
  rptDeletionPrompt(rptName) {
    ipc.sendSync('rptDeletionPrompt', rptName);
  }

  /*---------------------------------------------------------
  Delete a report configuration. Called after the user
  confirms that they want to delete it.
  ---------------------------------------------------------*/
  deleteRpt(rptName) {
    var tempRpts = this.state.customRptList;
    var newDefault = this.state.defaultRpt;
    var activeRpt = this.state.activeRpt;
    delete tempRpts[rptName];
    if(this.state.defaultRpt == rptName) { newDefault = SYS_DEFAULT_RPT_NAME; }
    if(this.state.activeRpt == rptName) { activeRpt = SYS_DEFAULT_RPT_NAME; }
    this.setState({
      customRptList: tempRpts,
      defaultRpt: newDefault,
      activeRpt: activeRpt
    });
    var newCustomRpts = {
      defaultRpt: newDefault == SYS_DEFAULT_RPT_NAME ? null : newDefault,
      rptConfigList: tempRpts
    }

    var state = this.state;
    new Promise(function(resolve, reject) {
      resolve(fs.writeFileSync(state.customRptFile, JSON.stringify(newCustomRpts), 'utf8', StatUtils2.printError));
    }).then(() => {
      ipc.sendSync('rebuildMenus', this.state.releasedRptList, tempRpts, activeRpt);
      return 1;
    }).catch((err) => {
      ipc.sendSync('genericModal', 'error', 'Error', 'Error saving settings:\n\n' + err.stack, true);
    });
  }

  /*---------------------------------------------------------
  Turn on and off settings for which optional entry fields
  should appear
  ---------------------------------------------------------*/
  toggleFormField(whichField, status) {
    if(this.state.formSettings[whichField] == undefined) { return; }
    var tempFormSettings = this.state.formSettings;
    tempFormSettings[whichField] = status;
    this.setState({
      formSettings: tempFormSettings
    });
  }

  /**
   * Save rank overrides entered in the sidebar. Throw out values that aren't numbers
   * @param  {RankingList} rankOverrides rankings from StatSidebar indexed by team name
   */
  saveRankOverrides(rankOverrides) {
    var tempTeams = this.state.allTeams;
    for(var i in tempTeams) {
      let rank = Math.round(rankOverrides[tempTeams[i].teamName]);
      if(!isNaN(rank) && rank >= 1) {
        tempTeams[i].rank = rank;
      }
      else { tempTeams[i].rank = null; }
    }
    this.setState({
      allTeams: tempTeams,
      reconstructSidebar: !this.state.reconstructSidebar
    });
    ipc.sendSync('unsavedData');
  }

  /**
   * Set the default round number
   * @param {number} roundNumber  round number to use
   */
  setDefaultRound(roundNumber) {
    if(isNaN(roundNumber) || roundNumber < -999999999 || roundNumber > 999999999) {
      this.setState({
        defaultRound: null
      });
      return;
    }
    this.setState({
      defaultRound: roundNumber
    });
  }

  /*---------------------------------------------------------
  Wrapper for materialize toast messages
  ---------------------------------------------------------*/
  toast(text) {
    M.toast({
      html: '<i class=\"material-icons\">check_circle</i>&emsp;' + text,
      classes: 'green-toast',
      displayLength: 2000
    });
  }



  render() {
    let filteredTeams = [];
    let filteredGames = [];
    let queryText = this.state.queryText.trim().toLowerCase();
    const allTeams = this.state.allTeams;
    const allGames = this.state.allGames;
    const activePane = this.state.activePane;
    const usingPhases = this.usingPhases();
    const usingDivisions = this.usingDivisions();
    const phasesToGroupBy = this.phasesToGroupBy();
    const [divsInPhase, phaseSizes] = this.cumulativeRankSetup(phasesToGroupBy);
    let errors = 0, warnings = 0;

    var rptObj = this.state.releasedRptList[this.state.activeRpt];
    if(rptObj == undefined) { rptObj = this.state.customRptList[this.state.activeRpt]; }

    // Get Materialize features to show up correctly
    $(document).ready(function() {
      M.Tooltip.init(document.querySelectorAll('.tooltipped'));//initialize tooltips
    });
    M.FormSelect.init(document.querySelectorAll('select'));//initialize all dropdowns
    M.FloatingActionButton.init(document.querySelectorAll('.fixed-action-btn')); //initialize floating buttons
    //for some reason, Materialize code will crash if I only initialize these once
    //perhaps one day I will figure out why
    M.Modal.init(document.querySelectorAll('#assignDivisions, #assignPhases'),
      {onCloseEnd: this.onModalClose, dismissible: false}
    );
    //open modals if appropriate
    if(this.state.tmWindowVisible === true) { this.materializeOpenModal('#addTeam'); }
    if(this.state.gmWindowVisible === true) { this.materializeOpenModal('#addGame'); }
    if(this.state.divEditWindowVisible === true) { this.materializeOpenModal('#editDivision'); }
    if(this.state.divWindowVisible === true) { this.materializeOpenModal('#assignDivisions'); }
    if(this.state.phaseWindowVisible === true) { this.materializeOpenModal('#assignPhases'); }
    if(this.state.rptConfigWindowVisible === true) { this.materializeOpenModal('#rptConfig'); }

    //sort and filter teams
    if (activePane == 'teamsPane') {
      //Filter list of teams
      for (var i = 0; i < allTeams.length; i++) {
        if (this.teamQueryMatch(queryText, allTeams[i])) {
          filteredTeams.push(allTeams[i]);
        }
      }
      //always sort alphabetically. Then sort by division if appropriate
      filteredTeams = _.orderBy(filteredTeams, function(item) {
        return item.teamName.toLowerCase();
      }, 'asc');
      if(this.state.teamOrder == 'division') {
        filteredTeams = _.orderBy(filteredTeams, function(item) {
          var div;
          if(usingPhases) { div = item.divisions[phasesToGroupBy[0]]; }
          else { div = item.divisions.noPhase; }
          if(div == undefined) { div = 'zzzzzzzzzzzzzzzzzzz'; } //teams with no division go (hopefully) at the end
          return div.toLowerCase();
        }, 'asc');
      }
    }
    //sort and filter games, and count errors and warnings
    else if (activePane == 'gamesPane') {
      //Filter list of games
      for (const g of allGames) {
        if(g.invalid) { errors++; }
        else if(g.validationMsg) { warnings++; }
        if (this.gameFilterMatch(queryText, g)) {
          filteredGames.push(g);
        }
      }
      filteredGames = _.orderBy(filteredGames, function(item) {
        const round = item.round;
        if(round === undefined || round === null) return -999999999;
        return +item.round;
      }, 'asc');
    }

    filteredTeams=filteredTeams.map(function(item, index) {
      return(
        <TeamListEntry key = {item.teamName + this.state.checkTeamToggle}
          team = {item}
          onDelete = {this.deleteTeam}
          openModal = {this.openTeamModal}
          onSelectTeam = {this.onSelectTeam}
          selected = {this.state.selectedTeams.includes(item)}
          numGamesPlayed = {StatUtils.gamesPlayed(item, allGames)}
          allPhases = {Object.keys(this.state.divisions)}
          usingDivisions = {usingDivisions}
          removeDivision = {this.removeDivisionFromTeam}
          activeInPhase = {this.teamBelongsToCurrentPhase(item)}
        />
      )
    }.bind(this));
    filteredGames=filteredGames.map(function(item, index) {
      return(
        <GameListEntry key = {index + this.state.checkGameToggle}
          game = {item}
          onDelete = {this.deleteGame}
          openModal = {this.openGameModal}
          onSelectGame = {this.onSelectGame}
          selected = {this.state.selectedGames.includes(item)}
          allPhases = {Object.keys(this.state.divisions)}
          usingPhases = {usingPhases}
          removePhase = {this.removePhaseFromGame}
          settings = {this.state.settings}
        />
      )
    }.bind(this));

    // need to make a deep copy of this object
    // to prevent player stats from updating before I tell them to
    const gameToLoadCopy = this.state.editWhichGame == null ? null : $.extend(true, {}, this.state.editWhichGame);

    const mainWindowClass = this.state.sidebarOpen ? 'col s12 l8' : 'col s12';

    var sidebar = null, sidebarContent;
    if(this.state.sidebarOpen) {
      if(this.state.importResult) {
        sidebarContent = (
          <ImportSidebar
            results = {this.state.importResult}
            close = {this.closeImportSidebar}
          />
        );
      }
      else {
        let standings = StatUtils.compileStandings(allTeams, allGames, this.state.viewingPhase,
          phasesToGroupBy, this.state.settings, rptObj, this.state.allGamesShowTbs)
        sidebarContent = (
          <StatSidebar key={this.state.reconstructSidebar}
            visible = {this.state.sidebarOpen}
            standings = {standings}
            phase = {this.state.viewingPhase}
            divisions = {divsInPhase}
            phasesToGroupBy = {phasesToGroupBy}
            phaseSizes = {phaseSizes}
            settings = {this.state.settings}
            rptConfig = {rptObj}
            filterByTeam = {this.filterByTeam}
            saveRankOverrides = {this.saveRankOverrides}
          />
        );
      }
      sidebar = ( <div id="sidebar" className="col l4 s0">{sidebarContent}</div> );
    }

    return(
      <div className="application">
        <div className="interface">
          <AddTeamModal
            teamToLoad = {this.state.editWhichTeam}
            addOrEdit = {this.state.tmAddOrEdit}
            addTeam = {this.addTeam}
            modifyTeam = {this.modifyTeam}
            isOpen = {this.state.tmWindowVisible}
            validateTeamName = {this.validateTeamName}
            playerIndex = {this.state.playerIndex}
            formSettings = {this.state.formSettings}
          />
          <AddGameModal
            gameToLoad = {gameToLoadCopy}
            addOrEdit = {this.state.gmAddOrEdit}
            addGame = {this.addGame}
            modifyGame = {this.modifyGame}
            isOpen = {this.state.gmWindowVisible}
            teamData = {allTeams.slice()}
            haveTeamsPlayedInRound = {this.haveTeamsPlayedInRound}
            allPhases = {Object.keys(this.state.divisions)}
            currentPhase = {this.state.viewingPhase != 'Tiebreakers' ? this.state.viewingPhase : 'all'}
            settings = {this.state.settings}
            defaultRound = {this.state.defaultRound}
          />
         <RptConfigModal
            isOpen = {this.state.rptConfigWindowVisible}
            tournamentSettings = {this.state.settings}
            releasedRptList = {this.state.releasedRptList}
            customRptList = {this.state.customRptList}
            defaultRpt = {this.state.defaultRpt}
            modifyRptConfig = {this.modifyRptConfig}
            setDefaultRpt = {this.setDefaultRpt}
            clearDefaultRpt = {this.clearDefaultRpt}
            attemptDeletion = {this.rptDeletionPrompt}
            systemDefault = {SYS_DEFAULT_RPT_NAME}
            usingDivisions = {usingDivisions}
         />
         <DivAssignModal key={JSON.stringify(this.state.divisions) + this.state.checkTeamToggle}
            isOpen = {this.state.divWindowVisible}
            divisions = {this.state.divisions}
            handleSubmit = {this.submitDivAssignments}
            usingPhases = {usingPhases}
          />
          <PhaseAssignModal key={JSON.stringify(this.state.divisions) + this.state.checkGameToggle + 'games'}
            isOpen = {this.state.phaseWindowVisible}
            divisions = {this.state.divisions}
            handleSubmit = {this.submitPhaseAssignments}
          />
          <DivisionEditModal
            isOpen = {this.state.divEditWindowVisible}
            addOrEdit = {this.state.divAddOrEdit}
            divisionToLoad = {this.state.editWhichDivision}
            divisions = {this.state.divisions}
            addDivision = {this.addDivision}
            modifyDivision = {this.modifyDivision}
            validateName = {this.validateDivisionName}
          />

          <div className="row">
            <div id="main-window" className={mainWindowClass}>
              <HeaderNav key={'nav' + this.state.navbarLoadToggle}
                onSearch= {this.searchLists}
                setPane = {this.setPane}
                setPhase = {this.setPhase}
                whichPaneActive = {activePane}
                viewingPhase = {this.state.viewingPhase}
                divisions = {this.state.divisions}
                tbsExist = {this.state.tbCount > 0}
                usingPhases = {usingPhases}
                usingDivisions = {usingDivisions}
                openDivModal = {this.openDivModal}
                openPhaseModal = {this.openPhaseModal}
                queryText = {this.state.queryText}
              />
              <SettingsForm key = {this.state.settingsLoadToggle}
                whichPaneActive = {activePane}
                settings = {this.state.settings}
                packets = {this.state.packets}
                divisions = {this.state.divisions}
                savePhases = {this.savePhases}
                openDivEditModal = {this.openDivEditModal}
                deleteDivision = {this.deleteDivision}
                reorderDivisions = {this.reorderDivisions}
                defaultPhases = {this.state.settings.defaultPhases}
                setDefaultGrouping = {this.setDefaultGrouping}
                saveSettings = {this.saveSettings}
                savePackets = {this.savePackets}
                gameIndex = {this.state.gameIndex}
                tbsExist = {this.state.tbCount > 0}
                toggleTbs = {this.toggleTiebreakers}
                editingSettings = {this.editingSettings}
                haveGamesBeenEntered = {this.state.allGames.length > 0}
              />
              <TeamList
                whichPaneActive = {activePane}
                teamList = {filteredTeams}
                openModal = {this.openTeamModal}
                totalTeams = {allTeams.length}
                sortTeamsBy = {this.sortTeamsBy}
                usingDivisions = {usingDivisions}
                numberSelected = {this.state.selectedTeams.length}
              />
              <GameList
                whichPaneActive = {activePane}
                gameList = {filteredGames}
                openModal = {this.openGameModal}
                numberOfTeams = {allTeams.length}
                totalGames = {allGames.length}
                numberSelected = {this.state.selectedGames.length}
                defaultRound = {this.state.defaultRound}
                setDefaultRound = {this.setDefaultRound}
                errors = {errors}
                warnings = {warnings}
                changeBadgeFilter = {this.changeBadgeFilter}
                activeBadgeFilter = {this.state.badgeFilter}
                importGames = {this.importGamesFromFileList}
              />
              <SidebarToggleButton
                toggle = {this.toggleSidebar}
                sidebarOpen = {this.state.sidebarOpen}
              />
            </div>
            {sidebar}

          </div>
        </div>{/* interface */}
      </div>
    );
  } //render
};//MainInterface

/**
 * ModaqQbjImport.ts
 * Alejandro Lopez-Lago
 *
 * Import logic for QBJ files produced by MODAQ
 * QBJ: https://schema.quizbowl.technology/
 * MODAQ: https://github.com/alopezlago/MODAQ/
 */

// Modaq doesn't include round infomration in the QBJ file, so that needs to be added form a dialog
// Unsure if anything else would be needed, but it does mean we need a React component
// Also need a menu item, which opens the Open Dialog. Having to specify a round means we can't do a mass import...

// One alternative is to have it as an add button... but you have the same round issue

// We need to convert the QBJ items into YfTypes, then put them somewhere. Benefit is there's no need for scoring rules,
// we assume it's the same

// Other challenge: need to map it to YellowFruit teams. We could use Team names, but we need to ensure that player
// names are also the same. Need to do a type of join.

// Need to
// - Parse JSON QBJ into something we understand (add interface), and take in a round number
// - Translate that into Yf types
// - Do a join/lookup to make sure that the teams and players exist, and that there are no typos (and warn the user if
//   there are typos)
// - Get the round from somewhere... maybe the UI? Can assume it is 0 now. Problem is you can't add games for the same
//       teams that have duplicate rounds.
//     - Alternative is for MODAQ to include the round number, although that might not be part of QBJ?
//     - It's not part of https://schema.quizbowl.technology/match, but it could help with imports.
//     - Export to QBJ doesn't include something for fields. Would have to be from New Game or passed in as a prop.

// Idea: pull information from QBJ file, then open up the New Game with the best guesses filled in (teams, player scores)

import StatUtils = require('./StatUtils');
import {  YfTeam, YfGame } from './YfTypes';

export function importGame(qbjString: string): { success: true, game: YfGame} | {success: false, error: string }  {
    // Parse this as a QBJ MODAQ file. Should we include MODAQ in here?
    // We need the existing tournament to see what teams and players we can match with. If the match is too bad, we need
    // to return something saying that the import failed (YfGame or string? Result?)

    return { success: false, error: "Unknown" };
}
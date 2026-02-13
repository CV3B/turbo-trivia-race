const { POWER_UPS, POWER_UP_SPAWN_CHANCE, MAX_POWER_UPS_PER_PLAYER, POWER_UP_PHASE_TIME } = require('./constants');

class PowerUpManager {
  constructor(room) {
    this.room = room;
  }

  /**
   * After each round, potentially award power-ups.
   * Trailing teams have higher spawn chance (rubber-banding).
   */
  awardPowerUps() {
    const positions = this.room.raceEngine.getPositions();
    const awarded = [];

    for (const player of this.room.players) {
      if (!player.connected || player.teamIndex < 0) continue;
      if (player.powerUps.length >= MAX_POWER_UPS_PER_PLAYER) continue;

      // Find team's position (0-indexed)
      const teamPos = positions.findIndex(p => p.teamIndex === player.teamIndex);
      if (teamPos < 0) continue;

      const spawnChance = POWER_UP_SPAWN_CHANCE[teamPos] || 0.25;

      if (Math.random() < spawnChance) {
        const powerUp = this.randomPowerUp();
        player.powerUps.push(powerUp);
        awarded.push({
          playerId: player.id,
          playerName: player.name,
          teamIndex: player.teamIndex,
          powerUp: { id: powerUp.id, name: powerUp.name }
        });
      }
    }

    return awarded;
  }

  randomPowerUp() {
    const types = Object.values(POWER_UPS);
    return { ...types[Math.floor(Math.random() * types.length)] };
  }

  usePowerUp(player, powerUpId, targetTeamIndex) {
    const puIndex = player.powerUps.findIndex(p => p.id === powerUpId);
    if (puIndex === -1) return null;

    const powerUp = player.powerUps.splice(puIndex, 1)[0];
    const result = { user: player.name, powerUp: powerUp.name, target: null, effect: null };

    switch (powerUp.id) {
      case 'nitro': {
        // Boost own team
        const team = this.room.teams[player.teamIndex];
        if (team) {
          team.advanceProgress(powerUp.effect);
          result.effect = `+${(powerUp.effect * 100).toFixed(0)}% boost!`;
        }
        break;
      }

      case 'oil': {
        // Slow target team
        const targetTeam = this.room.teams[targetTeamIndex];
        if (targetTeam && targetTeamIndex !== player.teamIndex) {
          // Check if any player on target team has shield
          const shielded = this.room.players.find(p =>
            p.teamIndex === targetTeamIndex && p.shielded
          );
          if (shielded) {
            shielded.shielded = false;
            result.effect = 'Blocked by shield!';
          } else {
            targetTeam.advanceProgress(powerUp.effect); // negative value
            result.target = targetTeam.name;
            result.effect = `${(powerUp.effect * 100).toFixed(0)}% to ${targetTeam.name}!`;
          }
        }
        break;
      }

      case 'tire_pop': {
        // Target team skips next advancement
        const targetTeam = this.room.teams[targetTeamIndex];
        if (targetTeam && targetTeamIndex !== player.teamIndex) {
          const targetPlayers = targetTeam.getPlayers(this.room.players);
          const shielded = targetPlayers.find(p => p.shielded);
          if (shielded) {
            shielded.shielded = false;
            result.effect = 'Blocked by shield!';
          } else {
            targetPlayers.forEach(p => p.skipNextAdvance = true);
            result.target = targetTeam.name;
            result.effect = `${targetTeam.name} skips next advance!`;
          }
        }
        break;
      }

      case 'shield': {
        player.shielded = true;
        result.effect = 'Shield activated!';
        break;
      }
    }

    // Notify everyone
    this.room.emitToAll('powerup:used', result);
    this.room.emitToPlayer(player, 'powerup:inventory', {
      powerUps: player.powerUps.map(p => ({ id: p.id, name: p.name }))
    });

    return result;
  }
}

module.exports = PowerUpManager;

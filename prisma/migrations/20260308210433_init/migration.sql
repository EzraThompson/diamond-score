-- CreateTable
CREATE TABLE "leagues" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "country" VARCHAR(50),
    "sport_id" INTEGER,
    "logo_url" VARCHAR(500),
    "season_start" DATE,
    "season_end" DATE,
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "leagues_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "teams" (
    "id" SERIAL NOT NULL,
    "league_id" INTEGER NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "abbreviation" VARCHAR(10),
    "name_local" VARCHAR(100),
    "logo_url" VARCHAR(500),
    "primary_color" VARCHAR(7),
    "secondary_color" VARCHAR(7),
    "external_id" VARCHAR(100),
    "external_source" VARCHAR(50),

    CONSTRAINT "teams_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "games" (
    "id" SERIAL NOT NULL,
    "league_id" INTEGER NOT NULL,
    "home_team_id" INTEGER NOT NULL,
    "away_team_id" INTEGER NOT NULL,
    "status" VARCHAR(20) NOT NULL,
    "scheduled_time" TIMESTAMPTZ,
    "current_inning" INTEGER,
    "inning_half" VARCHAR(10),
    "home_score" INTEGER NOT NULL DEFAULT 0,
    "away_score" INTEGER NOT NULL DEFAULT 0,
    "home_hits" INTEGER,
    "away_hits" INTEGER,
    "home_errors" INTEGER,
    "away_errors" INTEGER,
    "outs" INTEGER,
    "runners_on" JSONB,
    "balls" INTEGER,
    "strikes" INTEGER,
    "linescore" JSONB,
    "winning_pitcher" VARCHAR(100),
    "losing_pitcher" VARCHAR(100),
    "save_pitcher" VARCHAR(100),
    "external_id" VARCHAR(100),
    "external_source" VARCHAR(50),
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "games_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "standings" (
    "id" SERIAL NOT NULL,
    "league_id" INTEGER NOT NULL,
    "team_id" INTEGER NOT NULL,
    "season" INTEGER NOT NULL,
    "division" VARCHAR(50),
    "wins" INTEGER NOT NULL DEFAULT 0,
    "losses" INTEGER NOT NULL DEFAULT 0,
    "pct" DECIMAL(4,3),
    "games_back" DECIMAL(4,1),
    "streak" VARCHAR(10),
    "last_10" VARCHAR(10),
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "standings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "feedback" (
    "id" SERIAL NOT NULL,
    "message" TEXT NOT NULL,
    "page" VARCHAR(200),
    "game_id" VARCHAR(50),
    "resolved" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "feedback_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "idx_games_date" ON "games"("scheduled_time");

-- CreateIndex
CREATE INDEX "idx_games_status" ON "games"("status");

-- CreateIndex
CREATE INDEX "idx_games_league" ON "games"("league_id");

-- CreateIndex
CREATE INDEX "idx_standings_league_season" ON "standings"("league_id", "season");

-- AddForeignKey
ALTER TABLE "teams" ADD CONSTRAINT "teams_league_id_fkey" FOREIGN KEY ("league_id") REFERENCES "leagues"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "games" ADD CONSTRAINT "games_league_id_fkey" FOREIGN KEY ("league_id") REFERENCES "leagues"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "games" ADD CONSTRAINT "games_home_team_id_fkey" FOREIGN KEY ("home_team_id") REFERENCES "teams"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "games" ADD CONSTRAINT "games_away_team_id_fkey" FOREIGN KEY ("away_team_id") REFERENCES "teams"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "standings" ADD CONSTRAINT "standings_league_id_fkey" FOREIGN KEY ("league_id") REFERENCES "leagues"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "standings" ADD CONSTRAINT "standings_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

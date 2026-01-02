#!/usr/bin/env node
/**
 * Duplicate test scenarios for different environments
 * Generates development, staging, and docker versions of all scenarios
 */

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

// Environment configurations
const ENV_CONFIG = {
  development: {
    displayName: '개발',
    urls: {
      wbhubmanager: {
        TARGET_URL: 'http://localhost:3090',
        HUBMANAGER_URL: 'http://localhost:3090'
      },
      wbsaleshub: {
        SALESHUB_URL: 'http://localhost:3070',
        HUBMANAGER_URL: 'http://localhost:3090'
      },
      wbfinhub: {
        FINHUB_URL: 'http://localhost:3060',
        HUBMANAGER_URL: 'http://localhost:3090'
      }
    },
    schedule: null // Disable scheduled runs for dev
  },
  staging: {
    displayName: '스테이징',
    urls: {
      wbhubmanager: {
        TARGET_URL: 'https://wbhub-staging.up.railway.app',
        HUBMANAGER_URL: 'https://wbhub-staging.up.railway.app'
      },
      wbsaleshub: {
        SALESHUB_URL: 'https://wbsaleshub-staging.up.railway.app',
        HUBMANAGER_URL: 'https://wbhub-staging.up.railway.app'
      },
      wbfinhub: {
        FINHUB_URL: 'https://wbfinhub-staging.up.railway.app',
        HUBMANAGER_URL: 'https://wbhub-staging.up.railway.app'
      }
    },
    schedule: '0 */6 * * *' // Every 6 hours
  },
  docker: {
    displayName: 'Docker(PRD)',
    urls: {
      wbhubmanager: {
        TARGET_URL: 'http://158.180.95.246:3090',
        HUBMANAGER_URL: 'http://158.180.95.246:3090'
      },
      wbsaleshub: {
        SALESHUB_URL: 'http://158.180.95.246:3070',
        HUBMANAGER_URL: 'http://158.180.95.246:3090'
      },
      wbfinhub: {
        FINHUB_URL: 'http://158.180.95.246:3060',
        HUBMANAGER_URL: 'http://158.180.95.246:3090'
      }
    },
    schedule: null // Runs on-demand
  }
};

const scenariosDir = path.join(__dirname, '../scenarios');
const projects = ['wbhubmanager', 'wbsaleshub', 'wbfinhub'];

function duplicateScenario(project, filename, env, envConfig) {
  const sourcePath = path.join(scenariosDir, project, filename);

  if (!fs.existsSync(sourcePath)) {
    console.log(`⚠️  Skipping ${project}/${filename} - file not found`);
    return;
  }

  try {
    // Read and parse the source scenario
    const yamlContent = fs.readFileSync(sourcePath, 'utf8');
    const scenario = yaml.load(yamlContent);

    // Modify for target environment
    const baseName = filename.replace('.yaml', '');
    const newFilename = `${baseName}-${env}.yaml`;

    // Update name
    scenario.name = scenario.name.replace(/테스트/, `테스트 (${envConfig.displayName})`);

    // Update slug
    scenario.slug = `${scenario.slug}-${env}`;

    // Update environment
    scenario.environment = env;

    // Update schedule
    if (envConfig.schedule === null) {
      delete scenario.schedule;
    } else {
      scenario.schedule = envConfig.schedule;
    }

    // Update URLs in variables
    if (scenario.variables && envConfig.urls[project]) {
      Object.keys(envConfig.urls[project]).forEach(key => {
        if (scenario.variables[key]) {
          scenario.variables[key] = envConfig.urls[project][key];
        }
      });
    }

    // Write the new scenario
    const targetPath = path.join(scenariosDir, project, newFilename);
    const newYamlContent = yaml.dump(scenario, {
      lineWidth: -1,
      noRefs: true
    });

    fs.writeFileSync(targetPath, newYamlContent, 'utf8');
    console.log(`✅ Created: ${project}/${newFilename}`);

  } catch (error) {
    console.error(`❌ Error processing ${project}/${filename}:`, error.message);
  }
}

function main() {
  console.log('🚀 Duplicating scenarios for all environments...\n');

  let totalCreated = 0;

  // For each environment (dev, staging, docker)
  Object.keys(ENV_CONFIG).forEach(env => {
    console.log(`\n📁 Environment: ${env.toUpperCase()} (${ENV_CONFIG[env].displayName})`);
    console.log('━'.repeat(50));

    // For each project
    projects.forEach(project => {
      const projectDir = path.join(scenariosDir, project);

      if (!fs.existsSync(projectDir)) {
        console.log(`⚠️  Project directory not found: ${project}`);
        return;
      }

      // Get all YAML files (production scenarios only)
      const files = fs.readdirSync(projectDir)
        .filter(f => f.endsWith('.yaml') && !f.includes('-dev') && !f.includes('-staging') && !f.includes('-docker'));

      files.forEach(file => {
        duplicateScenario(project, file, env, ENV_CONFIG[env]);
        totalCreated++;
      });
    });
  });

  console.log('\n━'.repeat(50));
  console.log(`\n✅ Done! Created ${totalCreated} scenario files.`);
  console.log('\n💡 Restart the HWTestAgent server to load new scenarios:');
  console.log('   cd HWTestAgent && npm run dev\n');
}

main();

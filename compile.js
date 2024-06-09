const { exec } = require('child_process');

exec('tsc', (err, stdout, stderr) => {
    if (err) {
        console.error(`Error: ${stderr}`);
        return;
    }
    console.log(stdout);
});
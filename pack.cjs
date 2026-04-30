const { execSync } = require('child_process');
try {
  execSync('tar --exclude=node_modules --exclude=public/source.tar.gz -czvf public/source.tar.gz .');
  console.log('Archive created successfully');
} catch (e) {
  console.error(e);
}

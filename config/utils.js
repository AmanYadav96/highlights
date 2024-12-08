module.exports = {
    mapConfig(results) {
        const configMap = {};
      
        for (const result of results) {
          configMap[result.name] = result.value;
        }
      
        return configMap;
    },
    mapConfigXP(results) {
      const configMap = {};
    
      for (const result of results) {
        configMap[result.name] = result.xp;
      }
    
      return configMap;
  },
  formatDateTime(unixTimestamp) {
    const date = new Date(unixTimestamp * 1000);
    const formattedDate = date.toLocaleDateString();
    const formattedTime = date.toLocaleTimeString();
    return `${formattedDate} ${formattedTime}`;
  }
}
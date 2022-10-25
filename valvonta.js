let CONFIG = {
    Paivitystaajuus: 1 * 60000,
    ScriptId: "2"
};
function Valvonta() {
    Shelly.call("Script.GetStatus", { id: CONFIG.ScriptId  },
        function (res, error_code, error_msg, ud) {
            if (res.running === true) {
                print("Scripti toimii");
            }
            else {
                print("Scripti EI toimi");
                Shelly.call("Script.Start", { id: CONFIG.ScriptId }, null, null);

            };
        },
        null);
}

Timer.set(
    CONFIG.Paivitystaajuus,
    true,
    function (ud) {
        Valvonta();
    },
    null
);
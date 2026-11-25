(* Esempio didattico: nessuna funzione safety. I/O simbolici non mappati. *)
PROGRAM Main
VAR
    Start : BOOL := FALSE;
    Stop : BOOL := FALSE;
    Permissive : BOOL := FALSE;
    MotorRun : BOOL := FALSE;
END_VAR
IF Stop OR NOT Permissive THEN
    MotorRun := FALSE;
ELSE
    MotorRun := Start OR MotorRun;
END_IF;
END_PROGRAM

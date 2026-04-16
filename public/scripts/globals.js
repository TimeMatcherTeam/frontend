import { loginAuth } from "./auth.js";
import { getToken } from "./jwtUtils.js";
import { getAbilities } from "./requests.js";

export let JWT = getToken();

export let ABILITIES = {};
document.addEventListener("DOMContentLoaded", async () => {
    let res = await getAbilities();
    if (!res) {
        //! для разработки
        res = [
            {
                id: "8b8c390c-b450-4cba-88c2-dbccef95fcec",
                ability: "busy",
            },
            {
                id: "a5260825-e38c-4660-b774-fc0f85b1a7fc",
                ability: "partially_busy",
            },
        ];
    }
    for (const el of res) {
        let color = "";
        switch (el.ability) {
            case "busy":
                color = "red";
                break;
            case "unwanted":
                color = "yellow";
                break;
            default:
                break;
        }
        ABILITIES[el.ability] = {
            id: el.id,
            color: color,
        };
    }
    console.log(ABILITIES);
});

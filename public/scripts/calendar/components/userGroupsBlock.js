function createGroupRow(group, onAddGroup, onEditGroup) {
    const row = document.createElement("div");
    row.className = "user-groups-block-row";

    const info = document.createElement("div");
    info.className = "user-groups-block-info";

    const name = document.createElement("div");
    name.className = "user-groups-block-name";
    name.textContent = group?.name || "Без названия";

    const participants = Array.isArray(group?.participants) ? group.participants.length : 0;
    const meta = document.createElement("div");
    meta.className = "user-groups-block-meta";
    meta.textContent = `${participants} участников`;

    const actions = document.createElement("div");
    actions.className = "user-groups-block-actions";

    const addBtn = document.createElement("button");
    addBtn.type = "button";
    addBtn.className = "user-groups-block-add-btn";
    addBtn.textContent = "Добавить всех";
    addBtn.addEventListener("click", () => {
        if (typeof onAddGroup === "function") {
            onAddGroup(group);
        }
    });

    info.append(name, meta);
    actions.append(addBtn);

    if (typeof onEditGroup === "function") {
        const editIcon = document.createElement("img");
        editIcon.className = "user-group-action-icon";
        editIcon.src = "/assets/pencil-svgrepo-com.svg";
        editIcon.alt = "Редактировать/удалить";
        editIcon.title = "Редактировать группу";
        editIcon.addEventListener("click", () => {
            onEditGroup(group);
        });
        actions.append(editIcon);
    }
    row.append(info, actions);

    return row;
}

export function createUserGroupsBlock(hostNode, onAddGroup) {
    if (!hostNode) {
        return {
            render: () => {}
        };
    }

    hostNode.replaceChildren();

    const root = document.createElement("div");
    root.className = "user-groups-block";

    const list = document.createElement("div");
    list.className = "user-groups-block-list";

    root.appendChild(list);
    hostNode.appendChild(root);

    const render = (groups, callbacks = {}) => {
        list.replaceChildren();

        if (!Array.isArray(groups) || groups.length === 0) {
            const empty = document.createElement("div");
            empty.className = "user-groups-block-empty";
            empty.textContent = "У пользователя пока нет групп";
            list.appendChild(empty);
            return;
        }

        groups.forEach(group => {
            list.appendChild(createGroupRow(group, onAddGroup, callbacks.onEditGroup));
        });
    };

    return { render };
}

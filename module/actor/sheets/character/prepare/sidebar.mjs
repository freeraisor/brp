import { buildMoveView } from './character-tab.mjs';

export function prepareSidebar(context) {
  return {
    logo: context.logo,
    lock: {
      active: context.isLocked,
      action: 'actorToggle',
      property: 'lock',
      tooltip: 'BRP.lock'
    },
    identity: prepareSidebarIdentity(context),
    movement: buildMoveView(context.system),
    resources: prepareSidebarResources(context),
    statuses: context.statuses ?? []
  };
}

function prepareSidebarIdentity(context) {
  const identity = context.identity;
  const profession = identity.profession.value || game.i18n.localize(identity.profession.label);

  return {
    avatar: context.actor.img,
    avatarTooltip: context.actor.name,
    name: identity.name,
    subtitle: {
      primary: profession,
      secondary: identity.age.value
    }
  };
}

function prepareSidebarResources(context) {
  return context.resources.map(resource => ({
    ...resource,
    className: getResourceClassName(resource.id),
    hintValue: context.system.health.daily
  }));
}

function getResourceClassName(resourceId) {
  if (resourceId === 'health') return 'is-primary';
  if (resourceId === 'power') return 'is-power';
  return 'is-compact';
}

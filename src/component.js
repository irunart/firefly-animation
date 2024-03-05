export class BaseComponent {
  includeInFinalView() {
    return false;
  }

  onActivityStarted(idx, activity) {
  }

  onActivityPointForward(activity, fromPoint, toPoint) {
  }

  onActivityFinished(activity) {
  }

  draw(brush, width, height) {
  }
}
